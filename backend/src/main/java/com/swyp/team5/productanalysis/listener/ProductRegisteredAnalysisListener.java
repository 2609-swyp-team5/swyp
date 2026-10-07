package com.swyp.team5.productanalysis.listener;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
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
 * 같은 상품이 이미 대기 중이거나 분석 중이면 다시 넣지 않는다. 대기열은 메모리에만 있어 재시작하면 사라지므로, 분석되지 않은
 * 상품은 {@link com.swyp.team5.productanalysis.scheduler.PendingAnalysisRecoveryScheduler}가 다시 넣는다.
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

    // 대기열에 넣었거나 분석 중인 상품 ID
    private final Set<Long> queuedProductIds = ConcurrentHashMap.newKeySet();

    public ProductRegisteredAnalysisListener(ProductAnalysisService productAnalysisService) {
        this.productAnalysisService = productAnalysisService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onProductRegistered(ProductRegisteredEvent event) {
        enqueue(event.productId());
    }

    /**
     * 상품 분석을 대기열에 넣는다(이미 대기 중이거나 분석 중이면 무시).
     *
     * @return 새로 넣었으면 true
     */
    public boolean enqueue(Long productId) {
        if (!queuedProductIds.add(productId)) {
            return false;
        }
        try {
            executor.execute(() -> {
                try {
                    productAnalysisService.analyzeProductById(productId);
                } finally {
                    queuedProductIds.remove(productId);
                }
            });
        } catch (RuntimeException e) {
            // 종료 중이라 대기열에 넣지 못하면 기록을 되돌린다
            queuedProductIds.remove(productId);
            throw e;
        }
        return true;
    }

    @PreDestroy
    void shutdown() {
        executor.shutdownNow();
    }
}
