package com.swyp.team5.productanalysis.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

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
}
