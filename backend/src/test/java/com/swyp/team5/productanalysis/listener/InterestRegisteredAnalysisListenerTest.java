package com.swyp.team5.productanalysis.listener;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import com.swyp.team5.interest.event.InterestRegisteredEvent;
import com.swyp.team5.productanalysis.service.AnalysisProgressTracker;
import com.swyp.team5.productanalysis.service.ProductAnalysisService;
import org.junit.jupiter.api.Test;

// 관심 등록 직후 시세 분석 리스너 단위 테스트.
class InterestRegisteredAnalysisListenerTest {

    // 관심 등록 이벤트를 받으면 별도 스레드에서 그 대상을 분석
    @Test
    void analyzesInterestedItemInBackground() {
        ProductAnalysisService service = mock(ProductAnalysisService.class);
        InterestRegisteredAnalysisListener listener =
                new InterestRegisteredAnalysisListener(service, new AnalysisProgressTracker());

        listener.onInterestRegistered(new InterestRegisteredEvent(7L));

        verify(service, timeout(1000)).analyzeInterestedItemById(7L);
        listener.shutdown();
    }

    // 대기열에 넣는 순간부터 분석이 끝날 때까지 진행 중으로 기록하고, 끝나면 지움
    @Test
    void marksItemInProgressUntilAnalysisFinishes() throws InterruptedException {
        ProductAnalysisService service = mock(ProductAnalysisService.class);
        AnalysisProgressTracker tracker = new AnalysisProgressTracker();
        CountDownLatch release = new CountDownLatch(1);
        doAnswer(invocation -> release.await(1, TimeUnit.SECONDS)).when(service).analyzeInterestedItemById(7L);
        InterestRegisteredAnalysisListener listener = new InterestRegisteredAnalysisListener(service, tracker);

        listener.onInterestRegistered(new InterestRegisteredEvent(7L));

        // 분석이 끝나기 전에는 진행 중
        assertThat(tracker.inProgressAmong(List.of(7L))).containsExactly(7L);
        release.countDown();
        long deadline = System.currentTimeMillis() + 1000;
        while (!tracker.inProgressAmong(List.of(7L)).isEmpty() && System.currentTimeMillis() < deadline) {
            Thread.sleep(10);
        }
        assertThat(tracker.inProgressAmong(List.of(7L))).isEmpty();
        listener.shutdown();
    }
}
