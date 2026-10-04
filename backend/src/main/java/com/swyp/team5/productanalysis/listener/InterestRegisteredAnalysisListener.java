package com.swyp.team5.productanalysis.listener;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import jakarta.annotation.PreDestroy;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.swyp.team5.interest.event.InterestRegisteredEvent;
import com.swyp.team5.productanalysis.service.AnalysisProgressTracker;
import com.swyp.team5.productanalysis.service.ProductAnalysisService;

/**
 * 관심상품이 등록되면(등록 트랜잭션 커밋 후) 대상의 시세 분석을 1회 실행한다. 정기 배치(6시간)를 기다리지 않고 관심 목록에서 바로
 * 구매 추천(BUY/WAIT)·시세를 볼 수 있게 하기 위함이다. 등록 응답은 기다리지 않도록 별도 스레드에서 돌리고, AI 호출이 몰리지
 * 않도록 한 번에 한 건씩 처리한다. 첫 분석이면 관심 등록 회원에게 추천 알림도 간다(배치와 같은 규칙). 대기열에 넣는 순간부터
 * 분석이 끝날 때까지 {@link AnalysisProgressTracker}에 진행 중으로 기록한다(관심 목록에서 분석대기 대신 관찰중으로 보이도록).
 */
@Component
@ConditionalOnProperty(prefix = "analysis", name = "analyze-on-interest", havingValue = "true", matchIfMissing = true)
public class InterestRegisteredAnalysisListener {

    private final ProductAnalysisService productAnalysisService;
    private final AnalysisProgressTracker progressTracker;

    // 스프링 빈으로 Executor를 등록하면 기본 applicationTaskExecutor 자동 설정이 꺼지므로 이 리스너 안에서만 쓴다
    private final ExecutorService executor = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "analysis-on-interest");
        thread.setDaemon(true);
        return thread;
    });

    public InterestRegisteredAnalysisListener(
            ProductAnalysisService productAnalysisService, AnalysisProgressTracker progressTracker) {
        this.productAnalysisService = productAnalysisService;
        this.progressTracker = progressTracker;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onInterestRegistered(InterestRegisteredEvent event) {
        Long itemId = event.itemId();
        progressTracker.start(itemId);
        try {
            executor.execute(() -> {
                try {
                    productAnalysisService.analyzeInterestedItemById(itemId);
                } finally {
                    progressTracker.finish(itemId);
                }
            });
        } catch (RuntimeException e) {
            // 종료 중이라 대기열에 넣지 못하면 진행 중 기록을 되돌린다
            progressTracker.finish(itemId);
            throw e;
        }
    }

    @PreDestroy
    void shutdown() {
        executor.shutdownNow();
    }
}
