package com.swyp.team5.productanalysis.listener;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.swyp.team5.product.event.ProductPriceChangedEvent;
import com.swyp.team5.productanalysis.service.ProductAnalysisService;

/**
 * 상품 가격이 바뀌면 가장 최근 시세 분석의 가격 비교 근거(판매자 근거·구매자 추천과 근거)를 새 가격 기준으로 다시 쓴다. 가격 변경과
 * 같은 트랜잭션에서 규칙 문장으로 바로 바꿔, AI 재작성({@link PriceReasonAiListener} — 커밋 후)이 실패하거나 꺼져 있어도 예전 가격 기준
 * 문장이 남지 않게 한다.
 */
@Component
public class ProductPriceChangedListener {

    private final ProductAnalysisService productAnalysisService;

    public ProductPriceChangedListener(ProductAnalysisService productAnalysisService) {
        this.productAnalysisService = productAnalysisService;
    }

    @EventListener
    public void onPriceChanged(ProductPriceChangedEvent event) {
        productAnalysisService.refreshPriceReasons(event.productId());
    }
}
