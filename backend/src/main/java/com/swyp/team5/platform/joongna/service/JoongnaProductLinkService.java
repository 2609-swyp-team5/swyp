package com.swyp.team5.platform.joongna.service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.crawl.client.JoongnaProductClient;
import com.swyp.team5.crawl.dto.JoongnaProductDetail;
import com.swyp.team5.platform.bunjang.dto.ProductPlatformResponse;
import com.swyp.team5.platform.entity.MemberPlatform;
import com.swyp.team5.platform.entity.MemberPlatformStatus;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformType;
import com.swyp.team5.platform.entity.ProductPlatform;
import com.swyp.team5.platform.entity.ProductPlatformStatus;
import com.swyp.team5.platform.error.InvalidPlatformSessionException;
import com.swyp.team5.platform.error.InvalidProductUrlException;
import com.swyp.team5.platform.error.MemberPlatformNotFoundException;
import com.swyp.team5.platform.error.ProductPlatformAlreadyLinkedException;
import com.swyp.team5.platform.error.ProductPlatformNotFoundException;
import com.swyp.team5.platform.joongna.client.JoongnaProductUploader;
import com.swyp.team5.platform.joongna.dto.JoongnaSession;
import com.swyp.team5.platform.repository.MemberPlatformRepository;
import com.swyp.team5.platform.repository.PlatformRepository;
import com.swyp.team5.platform.repository.ProductPlatformRepository;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.error.ProductAccessDeniedException;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.repository.ProductRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class JoongnaProductLinkService {

    private static final String PLATFORM_NAME = PlatformType.JOONGNA.getPlatformName();
    private static final Pattern PRODUCT_SEQ_PATTERN = Pattern.compile("joongna\\.com/product/(\\d{6,})");
    private static final String SELLING = "SELLING";
    private static final String DELETED = "DELETED";

    private final PlatformRepository platformRepository;
    private final MemberPlatformRepository memberPlatformRepository;
    private final ProductPlatformRepository productPlatformRepository;
    private final ProductRepository productRepository;
    private final JoongnaProductClient joongnaProductClient;
    private final JoongnaConnectionService joongnaConnectionService;
    private final JoongnaProductUploader joongnaProductUploader;

    public ProductPlatformResponse link(Long memberId, Long productId, String productUrl) {
        MemberPlatform memberPlatform = getConnectedMemberPlatform(memberId);
        Product product = getOwnedProduct(memberId, productId);

        String productSeq = extractProductSeq(productUrl);
        if (DELETED.equals(joongnaProductClient.fetchDetail(productSeq).status())) {
            throw new InvalidProductUrlException("존재하지 않거나 삭제된 중고나라 매물입니다.", "productSeq=" + productSeq);
        }
        productPlatformRepository
                .findByProductIdAndMemberPlatformId(productId, memberPlatform.getId())
                .ifPresent(existing -> {
                    throw new ProductPlatformAlreadyLinkedException(productId, PLATFORM_NAME);
                });

        ProductPlatform productPlatform = productPlatformRepository.save(ProductPlatform.link(
                memberPlatform, product, productSeq, JoongnaProductPublishService.PRODUCT_URL_PREFIX + productSeq));
        product.markOnSaleIfDraft();
        return ProductPlatformResponse.from(productPlatform);
    }

    public ProductPlatformResponse syncStatus(Long memberId, Long productId) {
        MemberPlatform memberPlatform = getConnectedMemberPlatform(memberId);
        getOwnedProduct(memberId, productId);

        ProductPlatform productPlatform = productPlatformRepository
                .findByProductIdAndMemberPlatformId(productId, memberPlatform.getId())
                .orElseThrow(() -> new ProductPlatformNotFoundException(productId, PLATFORM_NAME));
        JoongnaProductDetail detail = joongnaProductClient.fetchDetail(productPlatform.getExternalProductId());
        if (SELLING.equals(detail.status())) {
            productPlatform.markPosted();
        } else {
            productPlatform.markRemoved();
        }
        return ProductPlatformResponse.from(productPlatform);
    }

    public ProductPlatformResponse remove(Long memberId, Long productId) {
        MemberPlatform memberPlatform = getConnectedMemberPlatform(memberId);
        getOwnedProduct(memberId, productId);

        ProductPlatform productPlatform = productPlatformRepository
                .findByProductIdAndMemberPlatformId(productId, memberPlatform.getId())
                .orElseThrow(() -> new ProductPlatformNotFoundException(productId, PLATFORM_NAME));
        if (productPlatform.getStatus() != ProductPlatformStatus.REMOVED
                && !DELETED.equals(joongnaProductClient
                        .fetchDetail(productPlatform.getExternalProductId())
                        .status())) {
            JoongnaSession session = joongnaConnectionService
                    .findValidSession(memberId)
                    .orElseThrow(() -> new InvalidPlatformSessionException("중고나라 계정 연결이 만료되었습니다. 다시 연결해 주십시오."));
            joongnaProductUploader.remove(session, productPlatform.getExternalProductId());
        }
        productPlatform.markRemoved();
        return ProductPlatformResponse.from(productPlatform);
    }

    private Product getOwnedProduct(Long memberId, Long productId) {
        Product product =
                productRepository.findById(productId).orElseThrow(() -> new ProductNotFoundException(productId));
        if (!product.isRegisteredBy(memberId)) {
            throw new ProductAccessDeniedException(productId);
        }
        return product;
    }

    private MemberPlatform getConnectedMemberPlatform(Long memberId) {
        Platform platform = platformRepository
                .findByName(PLATFORM_NAME)
                .orElseThrow(() -> new IllegalStateException("플랫폼이 시드되어 있지 않습니다: " + PLATFORM_NAME));
        MemberPlatform memberPlatform = memberPlatformRepository
                .findByMemberIdAndPlatformId(memberId, platform.getId())
                .orElseThrow(() -> new MemberPlatformNotFoundException(memberId, PLATFORM_NAME));
        if (memberPlatform.getStatus() != MemberPlatformStatus.CONNECTED) {
            throw new InvalidPlatformSessionException("중고나라 계정이 연결되어 있지 않습니다. 계정을 연결한 뒤 다시 시도해 주십시오.");
        }
        return memberPlatform;
    }

    private static String extractProductSeq(String productUrl) {
        Matcher matcher = PRODUCT_SEQ_PATTERN.matcher(productUrl);
        if (!matcher.find()) {
            throw new InvalidProductUrlException("중고나라 매물 주소가 올바르지 않습니다. 주소를 다시 확인해 주십시오.", "productUrl=" + productUrl);
        }
        return matcher.group(1);
    }
}
