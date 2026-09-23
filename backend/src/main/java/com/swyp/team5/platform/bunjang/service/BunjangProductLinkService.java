package com.swyp.team5.platform.bunjang.service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.crawl.client.BunjangProductClient;
import com.swyp.team5.crawl.dto.BunjangProductDetail;
import com.swyp.team5.platform.bunjang.dto.ProductPlatformResponse;
import com.swyp.team5.platform.entity.MemberPlatform;
import com.swyp.team5.platform.entity.MemberPlatformStatus;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformType;
import com.swyp.team5.platform.entity.ProductPlatform;
import com.swyp.team5.platform.error.InvalidPlatformSessionException;
import com.swyp.team5.platform.error.InvalidProductUrlException;
import com.swyp.team5.platform.error.MemberPlatformNotFoundException;
import com.swyp.team5.platform.error.ProductPlatformAlreadyLinkedException;
import com.swyp.team5.platform.error.ProductPlatformNotFoundException;
import com.swyp.team5.platform.repository.MemberPlatformRepository;
import com.swyp.team5.platform.repository.PlatformRepository;
import com.swyp.team5.platform.repository.ProductPlatformRepository;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.error.ProductAccessDeniedException;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.repository.ProductRepository;

/**
 * 회원이 이미 번개장터에 직접 등록해 둔 매물을 우리 상품과 연동(추적)하고, 그 판매 상태를 동기화한다.
 * 우리 서버가 대신 등록하는 기능은 {@link BunjangProductPublishService} 참고.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class BunjangProductLinkService {

    private static final String PLATFORM_NAME = PlatformType.BUNJANG.getPlatformName();
    private static final Pattern PRODUCT_ID_PATTERN = Pattern.compile("/products/(\\d{6,})");

    private final PlatformRepository platformRepository;
    private final MemberPlatformRepository memberPlatformRepository;
    private final ProductPlatformRepository productPlatformRepository;
    private final ProductRepository productRepository;
    private final BunjangProductClient bunjangProductClient;

    /**
     * @throws MemberPlatformNotFoundException 번개장터 세션이 연동되어 있지 않은 경우
     * @throws InvalidPlatformSessionException 세션이 연동되어 있지만 만료/해제 상태인 경우
     * @throws ProductNotFoundException 존재하지 않는 상품인 경우
     * @throws ProductAccessDeniedException 본인이 등록한 상품이 아닌 경우
     * @throws InvalidProductUrlException 주소에서 매물 ID를 추출할 수 없거나, 실제로 존재하지 않는 매물인 경우
     * @throws ProductPlatformAlreadyLinkedException 이미 연동된 상품인 경우
     */
    public ProductPlatformResponse link(Long memberId, Long productId, String productUrl) {
        MemberPlatform memberPlatform = getConnectedMemberPlatform(memberId);
        Product product = getProductOrThrow(productId);
        validateRegisteredBy(product, memberId);

        String externalProductId = extractProductId(productUrl);
        BunjangProductDetail detail = bunjangProductClient.fetchDetail(externalProductId);
        if (detail.errorCode() != null) {
            throw new InvalidProductUrlException("존재하지 않거나 삭제된 번개장터 매물입니다. errorCode=" + detail.errorCode());
        }

        productPlatformRepository
                .findByProductIdAndMemberPlatformId(productId, memberPlatform.getId())
                .ifPresent(existing -> {
                    throw new ProductPlatformAlreadyLinkedException(productId, PLATFORM_NAME);
                });

        ProductPlatform productPlatform = productPlatformRepository.save(
                ProductPlatform.link(memberPlatform, product, externalProductId, productUrl));
        return ProductPlatformResponse.from(productPlatform);
    }

    /**
     * @throws MemberPlatformNotFoundException 번개장터 세션이 연동되어 있지 않은 경우
     * @throws ProductNotFoundException 존재하지 않는 상품인 경우
     * @throws ProductAccessDeniedException 본인이 등록한 상품이 아닌 경우
     * @throws ProductPlatformNotFoundException 연동된 매물이 없는 경우
     */
    @Transactional
    public ProductPlatformResponse syncStatus(Long memberId, Long productId) {
        MemberPlatform memberPlatform = getConnectedMemberPlatform(memberId);
        Product product = getProductOrThrow(productId);
        validateRegisteredBy(product, memberId);

        ProductPlatform productPlatform = productPlatformRepository
                .findByProductIdAndMemberPlatformId(productId, memberPlatform.getId())
                .orElseThrow(() -> new ProductPlatformNotFoundException(productId, PLATFORM_NAME));

        BunjangProductDetail detail = bunjangProductClient.fetchDetail(productPlatform.getExternalProductId());
        if (detail.errorCode() != null || !detail.isSelling()) {
            productPlatform.markRemoved();
        } else {
            productPlatform.markPosted();
        }
        return ProductPlatformResponse.from(productPlatform);
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

    private Product getProductOrThrow(Long productId) {
        return productRepository.findById(productId).orElseThrow(() -> new ProductNotFoundException(productId));
    }

    private void validateRegisteredBy(Product product, Long memberId) {
        if (!product.isRegisteredBy(memberId)) {
            throw new ProductAccessDeniedException(product.getId());
        }
    }

    private String extractProductId(String productUrl) {
        Matcher matcher = PRODUCT_ID_PATTERN.matcher(productUrl);
        if (!matcher.find()) {
            throw new InvalidProductUrlException("번개장터 매물 주소에서 상품 ID를 찾을 수 없습니다: " + productUrl);
        }
        return matcher.group(1);
    }
}
