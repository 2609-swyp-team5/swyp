package com.swyp.team5.productanalysis.listener;

import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.swyp.team5.common.error.ErrorLogs;
import com.swyp.team5.product.event.ProductPriceChangedEvent;
import com.swyp.team5.productanalysis.service.ProductAnalysisService;

/**
 * 상품 가격 변경이 커밋되면 가장 최근 시세 분석의 근거 문장을 AI로 새 가격 기준에 맞춰 다시 쓴다. 가격 변경 트랜잭션 안에서는 규칙 문장으로
 * 먼저 바꿔 두므로({@link ProductPriceChangedListener}) AI가 실패해도 예전 가격 기준 문장은 남지 않는다. 요청 스레드에서 바로 처리해 가격
 * 변경 응답 뒤 분석을 다시 조회하면 AI 문장이 보이게 한다(응답이 AI 호출만큼 늦어짐).
 */
@Slf4j
@Component
@ConditionalOnProperty(
        prefix = "analysis",
        name = "ai-reason-on-price-change",
        havingValue = "true",
        matchIfMissing = true)
public class PriceReasonAiListener {

    private final ProductAnalysisService productAnalysisService;

    public PriceReasonAiListener(ProductAnalysisService productAnalysisService) {
        this.productAnalysisService = productAnalysisService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPriceChanged(ProductPriceChangedEvent event) {
        try {
            productAnalysisService
                    .requestPriceReasons(event.productId())
                    .ifPresent(productAnalysisService::applyPriceReasons);
        } catch (RuntimeException e) {
            log.warn(
                    "가격 변경 후 시세 분석 근거 AI 재작성 실패 - 규칙 문장을 유지합니다. productId={}, reason={}",
                    event.productId(),
                    ErrorLogs.describe(e));
        }
    }
}
