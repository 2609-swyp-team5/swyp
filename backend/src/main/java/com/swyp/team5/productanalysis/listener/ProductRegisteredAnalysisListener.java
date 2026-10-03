package com.swyp.team5.productanalysis.listener;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import jakarta.annotation.PreDestroy;

import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.swyp.team5.product.event.ProductRegisteredEvent;
import com.swyp.team5.productanalysis.service.ProductAnalysisService;

/**
 * 상품이 등록되면(등록 트랜잭션 커밋 후) 시세 분석을 1회 실행한다. 정기 배치(6시간)를 기다리지 않고 등록 직후 상세에서
 * 추천(SELL/HOLD)·시세·감가 예측을 볼 수 있게 하기 위함이다. 등록 응답은 기다리지 않도록 별도 스레드에서 돌리고, AI 호출이
 * 몰리지 않도록 한 번에 한 건씩 처리한다. 분석 결과가 저장되면 첫 분석이라 판매자에게 추천 알림도 간다(배치와 같은 규칙).
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "analysis", name = "analyze-on-register", havingValue = "true", matchIfMissing = true)
public class ProductRegisteredAnalysisListener {

    private final ProductAnalysisService productAnalysisService;

    // 스프링 빈으로 Executor를 등록하면 기본 applicationTaskExecutor 자동 설정이 꺼지므로 이 리스너 안에서만 쓴다
    private final ExecutorService executor = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "analysis-on-register");
        thread.setDaemon(true);
        return thread;
    });

    public ProductRegisteredAnalysisListener(ProductAnalysisService productAnalysisService) {
        this.productAnalysisService = productAnalysisService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onProductRegistered(ProductRegisteredEvent event) {
        executor.execute(() -> productAnalysisService.analyzeProductById(event.productId()));
    }

    @PreDestroy
    void shutdown() {
        executor.shutdownNow();
    }
}
