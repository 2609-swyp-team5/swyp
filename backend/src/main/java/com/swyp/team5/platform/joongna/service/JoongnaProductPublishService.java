package com.swyp.team5.platform.joongna.service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.swyp.team5.category.error.CategoryNotLeafException;
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
import com.swyp.team5.platform.joongna.client.JoongnaProductUploader;
import com.swyp.team5.platform.joongna.dto.JoongnaListingForm;
import com.swyp.team5.platform.joongna.dto.JoongnaSession;
import com.swyp.team5.platform.repository.CategoryPlatformRepository;
import com.swyp.team5.platform.repository.MemberPlatformRepository;
import com.swyp.team5.platform.repository.PlatformRepository;
import com.swyp.team5.platform.repository.ProductPlatformRepository;
import com.swyp.team5.product.entity.DeliveryType;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductImage;
import com.swyp.team5.product.error.ProductAccessDeniedException;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.repository.ProductRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class JoongnaProductPublishService {

    public static final String PRODUCT_URL_PREFIX = "https://web.joongna.com/product/";

    private static final String PLATFORM_NAME = PlatformType.JOONGNA.getPlatformName();
    private static final int POSTING_TIMEOUT_MINUTES = 10;
    private static final String NOT_CONNECTED_MESSAGE = "중고나라 계정이 연결되어 있지 않습니다. 계정을 연결한 뒤 다시 시도해 주십시오.";

    private final PlatformRepository platformRepository;
    private final MemberPlatformRepository memberPlatformRepository;
    private final ProductPlatformRepository productPlatformRepository;
    private final CategoryPlatformRepository categoryPlatformRepository;
    private final ProductRepository productRepository;
    private final JoongnaConnectionService joongnaConnectionService;
    private final JoongnaProductUploader joongnaProductUploader;
    private final TransactionTemplate transactionTemplate;

    public ProductPlatformResponse publish(Long memberId, Long productId) {
        PublishTarget target = transactionTemplate.execute(status -> prepare(memberId, productId));
        try {
            JoongnaSession session = joongnaConnectionService
                    .findValidSession(memberId)
                    .orElseThrow(() -> new InvalidPlatformSessionException(NOT_CONNECTED_MESSAGE));
            String productSeq = joongnaProductUploader.upload(session, target.form());
            return transactionTemplate.execute(status -> complete(target.productPlatformId(), productSeq));
        } catch (RuntimeException e) {
            log.warn("중고나라 매물 등록 실패. productId={}, reason={}", productId, e.getMessage());
            transactionTemplate.executeWithoutResult(status -> productPlatformRepository
                    .getReferenceById(target.productPlatformId())
                    .markFailed());
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
        if (!product.getCategory().isLeaf()) {
            throw new CategoryNotLeafException(product.getCategory().getId());
        }
        long categorySeq = categoryPlatformRepository
                .findByCategory_IdAndPlatform_Name(product.getCategory().getId(), PLATFORM_NAME)
                .map(mapping -> Long.parseLong(mapping.getExternalCategoryId()))
                .orElseThrow(() -> new PlatformPublishFailedException(
                        "중고나라에 등록할 수 없는 카테고리입니다.",
                        "categoryId=" + product.getCategory().getId()));

        ProductPlatform productPlatform = productPlatformRepository
                .findByProductIdAndMemberPlatformId(productId, memberPlatform.getId())
                .map(existing -> restartPosting(existing, productId))
                .orElseGet(() -> productPlatformRepository.save(ProductPlatform.startPosting(memberPlatform, product)));
        return new PublishTarget(productPlatform.getId(), toForm(product, categorySeq));
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

    private ProductPlatformResponse complete(Long productPlatformId, String productSeq) {
        ProductPlatform productPlatform = productPlatformRepository.getReferenceById(productPlatformId);
        productPlatform.markPosted(productSeq, PRODUCT_URL_PREFIX + productSeq);
        productPlatform.getProduct().markOnSaleIfDraft();
        return ProductPlatformResponse.from(productPlatform);
    }

    private static JoongnaListingForm toForm(Product product, long categorySeq) {
        List<String> imageUrls = product.getImages().stream()
                .sorted(Comparator.comparing(ProductImage::getImageOrder))
                .map(ProductImage::getImageUrl)
                .toList();
        String description =
                product.getDescription() == null || product.getDescription().isBlank()
                        ? product.getTitle()
                        : product.getDescription();
        return new JoongnaListingForm(
                product.getTitle(),
                product.getPrice(),
                description,
                categorySeq,
                product.getCondition() == ProductCondition.S,
                product.getDeliveryType() == DeliveryType.INCLUDED,
                imageUrls);
    }

    private MemberPlatform getConnectedMemberPlatform(Long memberId) {
        Platform platform = platformRepository
                .findByName(PLATFORM_NAME)
                .orElseThrow(() -> new IllegalStateException("플랫폼이 시드되어 있지 않습니다: " + PLATFORM_NAME));
        MemberPlatform memberPlatform = memberPlatformRepository
                .findByMemberIdAndPlatformId(memberId, platform.getId())
                .orElseThrow(() -> new MemberPlatformNotFoundException(memberId, PLATFORM_NAME));
        if (memberPlatform.getStatus() != MemberPlatformStatus.CONNECTED) {
            throw new InvalidPlatformSessionException(NOT_CONNECTED_MESSAGE);
        }
        return memberPlatform;
    }

    private record PublishTarget(Long productPlatformId, JoongnaListingForm form) {}
}
