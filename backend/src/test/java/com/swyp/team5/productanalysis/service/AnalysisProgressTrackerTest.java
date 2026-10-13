package com.swyp.team5.productanalysis.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;

import com.swyp.team5.productanalysis.dto.AnalysisStep;
import com.swyp.team5.productanalysis.dto.AnalysisStepEvent;
import org.junit.jupiter.api.Test;

// 시세 분석 진행 중 기록 단위 테스트.
class AnalysisProgressTrackerTest {

    // 같은 대상이 여러 번 시작되면 모두 끝나야 진행 중에서 빠짐(관심 등록 대기열 + 실제 분석)
    @Test
    void countsNestedStarts() {
        AnalysisProgressTracker tracker = new AnalysisProgressTracker();

        tracker.start(1L);
        tracker.start(1L);
        tracker.start(2L);
        tracker.finish(1L);

        assertThat(tracker.inProgressAmong(List.of(1L, 2L, 3L))).containsExactlyInAnyOrder(1L, 2L);

        tracker.finish(1L);
        tracker.finish(2L);
        tracker.finish(3L); // 시작하지 않은 대상의 종료는 무시

        assertThat(tracker.inProgressAmong(List.of(1L, 2L, 3L))).isEmpty();
    }

    // 종료 알림은 대상의 기록이 모두 빠졌을 때 한 번만 감(시작하지 않은 대상의 종료는 알리지 않음)
    @Test
    void notifiesOnlyWhenAllStartsFinish() {
        AnalysisProgressTracker tracker = new AnalysisProgressTracker();
        List<Long> finished = new ArrayList<>();
        tracker.onFinished(finished::add);

        tracker.start(1L);
        tracker.start(1L);
        tracker.finish(1L);
        assertThat(finished).isEmpty();

        tracker.finish(1L);
        tracker.finish(1L);
        tracker.finish(2L);
        assertThat(finished).containsExactly(1L);
    }

    // 알림 함수가 실패해도 다른 알림 함수와 진행 기록에는 영향이 없음
    @Test
    void listenerFailureDoesNotBreakTracking() {
        AnalysisProgressTracker tracker = new AnalysisProgressTracker();
        List<Long> finished = new ArrayList<>();
        tracker.onFinished(itemId -> {
            throw new IllegalStateException("boom");
        });
        tracker.onFinished(finished::add);

        tracker.start(1L);
        tracker.finish(1L);

        assertThat(finished).containsExactly(1L);
        assertThat(tracker.isInProgress(1L)).isFalse();
    }

    // 진행 중인 대상의 단계만 기록·알리고, 분석이 모두 끝나면 단계 기록도 지움
    @Test
    void recordsStepsOnlyWhileInProgress() {
        AnalysisProgressTracker tracker = new AnalysisProgressTracker();
        List<String> steps = new ArrayList<>();
        tracker.onStep((itemId, event) -> steps.add(itemId + ":" + event.step() + ":" + event.status()));

        tracker.stepStarted(1L, AnalysisStep.CANDIDATE_SEARCH);
        assertThat(tracker.currentStep(1L)).isEmpty();

        tracker.start(1L);
        assertThat(tracker.currentStep(1L)).isEmpty();
        tracker.stepStarted(1L, AnalysisStep.CANDIDATE_SEARCH);
        tracker.stepDone(1L, AnalysisStep.CANDIDATE_SEARCH);
        assertThat(tracker.currentStep(1L))
                .contains(AnalysisStepEvent.of(AnalysisStep.CANDIDATE_SEARCH, AnalysisStepEvent.DONE));
        tracker.finish(1L);

        assertThat(steps).containsExactly("1:CANDIDATE_SEARCH:START", "1:CANDIDATE_SEARCH:DONE");
        assertThat(tracker.currentStep(1L)).isEmpty();
    }

    // 단계 순서는 대기 < 시작 < 완료, 앞 단계 < 뒤 단계
    @Test
    void stepEventsAreOrdered() {
        AnalysisStepEvent waiting = AnalysisStepEvent.waiting();
        AnalysisStepEvent searchDone = AnalysisStepEvent.of(AnalysisStep.CANDIDATE_SEARCH, AnalysisStepEvent.DONE);
        AnalysisStepEvent aiStart = AnalysisStepEvent.of(AnalysisStep.AI_ANALYSIS, AnalysisStepEvent.START);

        assertThat(waiting.progressRank()).isLessThan(searchDone.progressRank());
        assertThat(searchDone.progressRank()).isLessThan(aiStart.progressRank());
        assertThat(waiting.index()).isEqualTo(1);
        assertThat(aiStart.index()).isEqualTo(2);
        assertThat(aiStart.total()).isEqualTo(AnalysisStep.values().length);
        assertThat(waiting.message()).isEqualTo("분석 순서를 기다리고 있어요.");
    }
}
