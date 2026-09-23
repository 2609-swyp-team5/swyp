package com.swyp.team5.platform.bunjang.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.platform.bunjang.client.BunjangProductUploader;
import com.swyp.team5.platform.bunjang.dto.BunjangListingForm;
import com.swyp.team5.platform.bunjang.dto.BunjangUploadResult;
import com.swyp.team5.platform.bunjang.dto.ProductPlatformResponse;
import com.swyp.team5.platform.entity.MemberPlatform;
import com.swyp.team5.platform.entity.MemberPlatformStatus;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformType;
import com.swyp.team5.platform.entity.ProductPlatform;
import com.swyp.team5.platform.entity.ProductPlatformStatus;
import com.swyp.team5.platform.error.InvalidPlatformSessionException;
import com.swyp.team5.platform.error.MemberPlatformNotFoundException;
import com.swyp.team5.platform.error.PlatformPublishFailedException;
import com.swyp.team5.platform.error.ProductPlatformAlreadyLinkedException;
import com.swyp.team5.platform.error.ProductPlatformPublishInProgressException;
import com.swyp.team5.platform.repository.MemberPlatformRepository;
import com.swyp.team5.platform.repository.PlatformRepository;
import com.swyp.team5.platform.repository.ProductPlatformRepository;
import com.swyp.team5.product.entity.DeliveryType;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductImage;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.error.ProductAccessDeniedException;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.tag.entity.Tag;

/**
 * 우리 상품을 회원의 번개장터 계정에 대신 등록한다. 브라우저 자동화로 등록하는 데 수십 초가 걸리므로,
 * DB 트랜잭션은 등록 전(검증 + 등록 진행 중 상태 기록)과 등록 후(결과 반영)로 나눠 짧게 잡고 브라우저
 * 작업 동안에는 커넥션을 붙잡지 않는다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BunjangProductPublishService {

    private static final String PLATFORM_NAME = PlatformType.BUNJANG.getPlatformName();
    // 등록 진행 중 상태가 이 시간보다 오래 유지되면(서버 재시작 등으로 중단된 경우) 다시 등록할 수 있게 한다
    private static final int POSTING_TIMEOUT_MINUTES = 10;

    private final PlatformRepository platformRepository;
    private final MemberPlatformRepository memberPlatformRepository;
    private final ProductPlatformRepository productPlatformRepository;
    private final ProductRepository productRepository;
    private final BunjangProductUploader bunjangProductUploader;
    private final TransactionTemplate transactionTemplate;

    /**
     * @throws MemberPlatformNotFoundException 번개장터 세션이 연동되어 있지 않은 경우
     * @throws InvalidPlatformSessionException 세션이 만료/해제 상태이거나, 등록 중 세션 만료가 확인된 경우
     * @throws ProductNotFoundException 존재하지 않는 상품인 경우
     * @throws ProductAccessDeniedException 본인이 등록한 상품이 아닌 경우
     * @throws ProductPlatformAlreadyLinkedException 이미 번개장터에 게시된 상품인 경우
     * @throws ProductPlatformPublishInProgressException 같은 상품의 등록이 이미 진행 중인 경우
     * @throws PlatformPublishFailedException 번개장터 화면 입력/등록 요청이 실패한 경우
     */
    public ProductPlatformResponse publish(Long memberId, Long productId) {
        PublishTarget target = transactionTemplate.execute(status -> prepare(memberId, productId));
        try {
            BunjangUploadResult result = bunjangProductUploader.upload(target.sessionToken(), target.form());
            return transactionTemplate.execute(status -> complete(target.productPlatformId(), result));
        } catch (RuntimeException e) {
            log.warn("번개장터 매물 등록 실패. productId={}, reason={}", productId, e.getMessage());
            transactionTemplate.executeWithoutResult(status -> fail(target, e));
            throw e;
        }
    }

    private PublishTarget prepare(Long memberId, Long productId) {
        MemberPlatform memberPlatform = getConnectedMemberPlatform(memberId);
        Product product =
                productRepository.findById(productId).orElseThrow(() -> new ProductNotFoundException(productId));
        if (!product.isRegisteredBy(memberId)) {
            throw new ProductAccessDeniedException(productId);
        }

        ProductPlatform productPlatform = productPlatformRepository
                .findByProductIdAndMemberPlatformId(productId, memberPlatform.getId())
                .map(existing -> restartPosting(existing, productId))
                .orElseGet(() -> productPlatformRepository.save(ProductPlatform.startPosting(memberPlatform, product)));

        return new PublishTarget(
                productPlatform.getId(), memberPlatform.getId(), memberPlatform.getSessionToken(), toForm(product));
    }

    private ProductPlatform restartPosting(ProductPlatform existing, Long productId) {
        if (existing.getStatus() == ProductPlatformStatus.POSTED) {
            throw new ProductPlatformAlreadyLinkedException(productId, PLATFORM_NAME);
        }
        if (existing.isPostingSince(LocalDateTime.now().minusMinutes(POSTING_TIMEOUT_MINUTES))) {
            throw new ProductPlatformPublishInProgressException(productId, PLATFORM_NAME);
        }
        existing.restartPosting();
        return existing;
    }

    private ProductPlatformResponse complete(Long productPlatformId, BunjangUploadResult result) {
        ProductPlatform productPlatform = productPlatformRepository.getReferenceById(productPlatformId);
        productPlatform.markPosted(result.externalProductId(), result.productUrl());
        return ProductPlatformResponse.from(productPlatform);
    }

    private void fail(PublishTarget target, RuntimeException cause) {
        productPlatformRepository.getReferenceById(target.productPlatformId()).markFailed();
        if (cause instanceof InvalidPlatformSessionException) {
            memberPlatformRepository.getReferenceById(target.memberPlatformId()).markExpired();
        }
    }

    private BunjangListingForm toForm(Product product) {
        List<String> imageUrls = product.getImages().stream()
                .sorted(Comparator.comparing(ProductImage::getImageOrder))
                .map(ProductImage::getImageUrl)
                .toList();
        String description =
                product.getDescription() == null || product.getDescription().isBlank()
                        ? product.getTitle()
                        : product.getDescription();
        boolean directTrade = product.getTradeMethod() == TradeMethod.DIRECT;

        return new BunjangListingForm(
                product.getTitle(),
                product.getPrice(),
                description,
                categoryPath(product.getCategory()),
                conditionLabel(product.getCondition()),
                product.getTags().stream().map(Tag::getName).toList(),
                directTrade,
                directTrade ? product.getPreferredTradeRegion() : null,
                product.getDeliveryType() == DeliveryType.INCLUDED,
                imageUrls);
    }

    /** 우리 카테고리는 번개장터 메뉴를 기준으로 시드돼 이름이 같으므로, 대분류부터의 이름 경로를 그대로 쓴다. */
    private List<String> categoryPath(Category category) {
        List<String> path = new ArrayList<>();
        for (Category current = category; current != null; current = current.getParent()) {
            path.addFirst(current.getName());
        }
        return path;
    }

    /** 우리 상태 등급(S~D)을 번개장터 상품 상태 선택지로 변환한다. */
    private String conditionLabel(ProductCondition condition) {
        return switch (condition) {
            case S -> "새 상품(미사용)";
            case A -> "사용감 없음";
            case B -> "사용감 적음";
            case C, D -> "사용감 많음";
        };
    }

    private MemberPlatform getConnectedMemberPlatform(Long memberId) {
        Platform platform = platformRepository
                .findByName(PLATFORM_NAME)
                .orElseThrow(() -> new IllegalStateException("플랫폼이 시드되어 있지 않습니다: " + PLATFORM_NAME));
        MemberPlatform memberPlatform = memberPlatformRepository
                .findByMemberIdAndPlatformId(memberId, platform.getId())
                .orElseThrow(() -> new MemberPlatformNotFoundException(memberId, PLATFORM_NAME));
        if (memberPlatform.getStatus() != MemberPlatformStatus.CONNECTED) {
            throw new InvalidPlatformSessionException("번개장터 세션이 연동되어 있지 않습니다. 다시 연동한 뒤 시도해 주세요.");
        }
        return memberPlatform;
    }

    private record PublishTarget(
            Long productPlatformId, Long memberPlatformId, String sessionToken, BunjangListingForm form) {}
}
