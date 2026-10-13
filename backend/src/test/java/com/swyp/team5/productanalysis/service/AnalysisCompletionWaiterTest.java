package com.swyp.team5.productanalysis.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import com.swyp.team5.productanalysis.dto.AnalysisPerspective;
import com.swyp.team5.productanalysis.dto.AnalysisStep;
import com.swyp.team5.productanalysis.dto.AnalysisStepEvent;
import com.swyp.team5.productanalysis.dto.ProductAnalysisResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// 진행 중인 시세 분석 완료 대기 - 진행 기록(AnalysisProgressTracker)은 실제 객체, 결과 조회만 목.
class AnalysisCompletionWaiterTest {

    private static final long ITEM_ID = 1L;

    private final ProductAnalysisService productAnalysisService = mock(ProductAnalysisService.class);
    private final ProductAnalysisResponse latest = mock(ProductAnalysisResponse.class);
    private AnalysisProgressTracker tracker;
    private AnalysisCompletionWaiter waiter;

    @BeforeEach
    void setUp() {
        tracker = new AnalysisProgressTracker();
        waiter = new AnalysisCompletionWaiter(productAnalysisService, tracker);
        when(productAnalysisService.getLatestAnalysis(ITEM_ID, AnalysisPerspective.SELL))
                .thenReturn(latest);
    }

    // 분석 중이 아니면 기다리지 않고 바로 최신 결과, 단계 이벤트 없음
    @Test
    void returnsLatestImmediatelyWhenNotInProgress() {
        List<AnalysisStepEvent> steps = new CopyOnWriteArrayList<>();

        ProductAnalysisResponse result = waiter.await(ITEM_ID, Duration.ofSeconds(10), steps::add, () -> false);

        assertThat(result).isSameAs(latest);
        assertThat(steps).isEmpty();
    }

    // 분석 중이면 대기(WAITING)부터 단계를 넘기고, 늦게 온 이전 단계는 거르며, 분석이 끝나면 최신 결과를 돌려줌
    @Test
    void forwardsStepsUntilFinished() throws Exception {
        tracker.start(ITEM_ID);
        List<AnalysisStepEvent> steps = new CopyOnWriteArrayList<>();
        CountDownLatch waiting = new CountDownLatch(1);
        Thread analysis = new Thread(() -> {
            try {
                waiting.await(5, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            tracker.stepStarted(ITEM_ID, AnalysisStep.CANDIDATE_SEARCH);
            tracker.stepDone(ITEM_ID, AnalysisStep.CANDIDATE_SEARCH);
            tracker.stepStarted(ITEM_ID, AnalysisStep.CANDIDATE_SEARCH); // 늦게 온 이전 단계
            tracker.stepStarted(ITEM_ID, AnalysisStep.AI_ANALYSIS);
            tracker.finish(ITEM_ID);
        });
        analysis.start();

        ProductAnalysisResponse result = waiter.await(
                ITEM_ID,
                Duration.ofSeconds(10),
                event -> {
                    steps.add(event);
                    waiting.countDown();
                },
                () -> false);
        analysis.join();

        assertThat(result).isSameAs(latest);
        assertThat(steps)
                .extracting(AnalysisStepEvent::step, AnalysisStepEvent::status)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(AnalysisStep.CANDIDATE_SEARCH, AnalysisStepEvent.WAITING),
                        org.assertj.core.groups.Tuple.tuple(AnalysisStep.CANDIDATE_SEARCH, AnalysisStepEvent.START),
                        org.assertj.core.groups.Tuple.tuple(AnalysisStep.CANDIDATE_SEARCH, AnalysisStepEvent.DONE),
                        org.assertj.core.groups.Tuple.tuple(AnalysisStep.AI_ANALYSIS, AnalysisStepEvent.START));
    }

    // 대기 시간이 지나면 분석이 끝나지 않았어도 그때의 결과를 돌려줌
    @Test
    void stopsWaitingAfterTimeout() {
        tracker.start(ITEM_ID);
        long started = System.nanoTime();

        ProductAnalysisResponse result = waiter.await(ITEM_ID, Duration.ofMillis(200), event -> {}, () -> false);

        assertThat(result).isSameAs(latest);
        assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(5));
        assertThat(tracker.isInProgress(ITEM_ID)).isTrue(); // 분석 자체는 그대로
    }

    // 중단 조건(예: 연결 끊김)이 참이면 바로 멈춤
    @Test
    void stopsWaitingWhenStopped() {
        tracker.start(ITEM_ID);
        long started = System.nanoTime();

        ProductAnalysisResponse result = waiter.await(ITEM_ID, Duration.ofSeconds(30), event -> {}, () -> true);

        assertThat(result).isSameAs(latest);
        assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(5));
    }
}
