package com.swyp.team5.product.service;

import java.time.LocalDateTime;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.notification.service.NotificationService;
import com.swyp.team5.product.dto.ProductTargetPriceResponse;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.error.ProductAccessDeniedException;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;

/**
 * 판매자 목표 판매가. 내 상품의 최근 시세 분석 평균가가 목표가 이상이 되면 판매자에게 알림을 1번 보내고
 * {@code target_price_notified_at}에 기록한다. 평균가가 다시 목표가 아래로 내려가면 기록을 지워 다음에 오를 때 다시 알린다.
 * 목표가를 바꿔도 여전히 도달 상태면 다시 알리지 않는다(아직 도달 전인 목표가로 바꾸면 기록을 지움). 판매 완료 상품은 확인하지 않는다.
 *
 * <p>확인 시점: 목표가 설정 직후(최근 분석 기준), 시세 분석 저장 직후.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ProductTargetPriceService {

    private final ProductRepository productRepository;
    private final ProductAnalysisRepository productAnalysisRepository;
    private final NotificationService notificationService;

    /**
     * @throws ProductNotFoundException 존재하지 않는 상품인 경우
     * @throws ProductAccessDeniedException 본인이 등록한 상품이 아닌 경우
     */
    @Transactional(readOnly = true)
    public ProductTargetPriceResponse getTargetPrice(Long memberId, Long productId) {
        Product product = getOwnedProductOrThrow(memberId, productId);
        return ProductTargetPriceResponse.of(product, latestAveragePrice(productId));
    }

    /**
     * 목표 판매가를 설정(재설정)한다. {@code null}이면 해제. 이미 최근 분석 평균가가 목표가 이상이면 바로 알림을 만든다.
     *
     * @throws ProductNotFoundException 존재하지 않는 상품인 경우
     * @throws ProductAccessDeniedException 본인이 등록한 상품이 아닌 경우
     */
    public ProductTargetPriceResponse setTargetPrice(Long memberId, Long productId, Long targetPrice) {
        Product product = getOwnedProductOrThrow(memberId, productId);
        Long averagePrice = latestAveragePrice(productId);
        product.changeTargetPrice(targetPrice, averagePrice);
        check(product, averagePrice);
        return ProductTargetPriceResponse.of(product, averagePrice);
    }

    /**
     * 시세 분석 저장 직후 호출한다. 분석 쪽 상품 엔티티는 영속성 컨텍스트 밖일 수 있어 다시 읽어 확인한다.
     *
     * @return 이번에 알림을 만들었으면 {@code true}
     */
    public boolean checkAfterAnalysis(Long productId, long averagePrice) {
        return productRepository
                .findById(productId)
                .map(product -> check(product, averagePrice))
                .orElse(false);
    }

    private boolean check(Product product, Long averagePrice) {
        Long targetPrice = product.getTargetPrice();
        if (targetPrice == null || averagePrice == null || product.getStatus() == ProductStatus.SOLD_OUT) {
            return false;
        }
        if (averagePrice < targetPrice) {
            product.resetTargetPriceNotified();
            return false;
        }
        if (product.getTargetPriceNotifiedAt() != null) {
            return false;
        }
        // 회원이 목표가 알림을 꺼 둬서 안 보냈으면 보낸 것으로 기록하지 않는다(다시 켜면 다음 확인에서 보냄)
        if (!notificationService.notifySellerTargetPriceReached(product, averagePrice)) {
            return false;
        }
        product.markTargetPriceNotified(LocalDateTime.now());
        return true;
    }

    private Long latestAveragePrice(Long productId) {
        return productAnalysisRepository
                .findFirstByItemIdOrderByAnalyzedAtDesc(productId)
                .map(ProductAnalysis::getAveragePrice)
                .orElse(null);
    }

    private Product getOwnedProductOrThrow(Long memberId, Long productId) {
        Product product =
                productRepository.findById(productId).orElseThrow(() -> new ProductNotFoundException(productId));
        if (!product.isRegisteredBy(memberId)) {
            throw new ProductAccessDeniedException(productId);
        }
        return product;
    }
}
