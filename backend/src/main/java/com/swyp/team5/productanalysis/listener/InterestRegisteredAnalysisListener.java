package com.swyp.team5.productanalysis.listener;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import jakarta.annotation.PreDestroy;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.swyp.team5.interest.event.InterestRegisteredEvent;
import com.swyp.team5.productanalysis.service.AnalysisProgressTracker;
import com.swyp.team5.productanalysis.service.ProductAnalysisService;

/**
 * 관심상품이 등록되면(등록 트랜잭션 커밋 후) 대상의 시세 분석을 1회 실행한다. 정기 배치(6시간)를 기다리지 않고 관심 목록에서 바로
 * 구매 추천(BUY/WAIT)·시세를 볼 수 있게 하기 위함이다. 등록 응답은 기다리지 않도록 별도 스레드에서 돌리고, 여러 건을 연달아
 * 등록해도 오래 줄 서지 않도록 {@code analysis.interest-concurrency}건(기본 3)까지 동시에 처리한다(AI 호출이 몰리면 이 값을
 * 줄인다). 같은 대상이 이미 대기 중이거나 분석 중이면 다시 넣지 않는다(같은 대상 동시 분석·알림 중복 방지). 첫 분석이면 관심
 * 등록 회원에게 추천 알림도 간다(배치와 같은 규칙). 대기열에 넣는 순간부터
 * 분석이 끝날 때까지 {@link AnalysisProgressTracker}에 진행 중으로 기록한다(관심 목록에서 분석대기 대신 관찰중으로 보이도록).
 * 대기열은 메모리에만 있어 재시작하면 사라지므로, 분석되지 않은 대상은
 * {@link com.swyp.team5.productanalysis.scheduler.PendingAnalysisRecoveryScheduler}가 다시 넣는다.
 */
@Component
@ConditionalOnProperty(prefix = "analysis", name = "analyze-on-interest", havingValue = "true", matchIfMissing = true)
public class InterestRegisteredAnalysisListener {

    private final ProductAnalysisService productAnalysisService;
    private final AnalysisProgressTracker progressTracker;

    // 스프링 빈으로 Executor를 등록하면 기본 applicationTaskExecutor 자동 설정이 꺼지므로 이 리스너 안에서만 쓴다
    private final ExecutorService executor;

    // 이 리스너가 대기열에 넣었거나 분석 중인 대상 ID
    private final Set<Long> queuedItemIds = ConcurrentHashMap.newKeySet();

    public InterestRegisteredAnalysisListener(
            ProductAnalysisService productAnalysisService,
            AnalysisProgressTracker progressTracker,
            @Value("${analysis.interest-concurrency:3}") int concurrency) {
        this.productAnalysisService = productAnalysisService;
        this.progressTracker = progressTracker;
        AtomicInteger threadNumber = new AtomicInteger();
        this.executor = Executors.newFixedThreadPool(Math.max(1, concurrency), runnable -> {
            Thread thread = new Thread(runnable, "analysis-on-interest-" + threadNumber.incrementAndGet());
            thread.setDaemon(true);
            return thread;
        });
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onInterestRegistered(InterestRegisteredEvent event) {
        enqueue(event.itemId());
    }

    /**
     * 대상 분석을 대기열에 넣는다(이미 대기 중이거나 분석 중이면 무시 — 그 분석이 끝나면 결과·알림이 같이 반영된다).
     *
     * @return 새로 넣었으면 true
     */
    public boolean enqueue(Long itemId) {
        if (!queuedItemIds.add(itemId)) {
            return false;
        }
        progressTracker.start(itemId);
        try {
            executor.execute(() -> {
                try {
                    productAnalysisService.analyzeInterestedItemById(itemId);
                } finally {
                    queuedItemIds.remove(itemId);
                    progressTracker.finish(itemId);
                }
            });
        } catch (RuntimeException e) {
            // 종료 중이라 대기열에 넣지 못하면 기록을 되돌린다
            queuedItemIds.remove(itemId);
            progressTracker.finish(itemId);
            throw e;
        }
        return true;
    }

    @PreDestroy
    void shutdown() {
        executor.shutdownNow();
    }
}
