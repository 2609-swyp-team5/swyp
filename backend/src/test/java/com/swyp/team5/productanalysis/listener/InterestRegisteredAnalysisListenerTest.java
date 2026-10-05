package com.swyp.team5.productanalysis.listener;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
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
                new InterestRegisteredAnalysisListener(service, new AnalysisProgressTracker(), 3);

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
        InterestRegisteredAnalysisListener listener = new InterestRegisteredAnalysisListener(service, tracker, 3);

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

    // 서로 다른 대상은 설정한 수(3)까지 동시에 분석
    @Test
    void analyzesDifferentItemsConcurrently() throws InterruptedException {
        ProductAnalysisService service = mock(ProductAnalysisService.class);
        CountDownLatch allStarted = new CountDownLatch(3);
        CountDownLatch release = new CountDownLatch(1);
        doAnswer(invocation -> {
                    allStarted.countDown();
                    return release.await(2, TimeUnit.SECONDS);
                })
                .when(service)
                .analyzeInterestedItemById(anyLong());
        InterestRegisteredAnalysisListener listener =
                new InterestRegisteredAnalysisListener(service, new AnalysisProgressTracker(), 3);

        listener.onInterestRegistered(new InterestRegisteredEvent(1L));
        listener.onInterestRegistered(new InterestRegisteredEvent(2L));
        listener.onInterestRegistered(new InterestRegisteredEvent(3L));

        // 앞 분석이 끝나지 않아도 세 건이 모두 시작됨
        assertThat(allStarted.await(1, TimeUnit.SECONDS)).isTrue();
        release.countDown();
        listener.shutdown();
    }

    // 같은 대상이 대기 중이거나 분석 중이면 다시 넣지 않고, 끝난 뒤에는 다시 분석할 수 있음
    @Test
    void skipsSameItemWhileQueuedOrRunning() throws InterruptedException {
        ProductAnalysisService service = mock(ProductAnalysisService.class);
        AnalysisProgressTracker tracker = new AnalysisProgressTracker();
        CountDownLatch release = new CountDownLatch(1);
        doAnswer(invocation -> release.await(1, TimeUnit.SECONDS)).when(service).analyzeInterestedItemById(7L);
        InterestRegisteredAnalysisListener listener = new InterestRegisteredAnalysisListener(service, tracker, 3);

        listener.onInterestRegistered(new InterestRegisteredEvent(7L));
        listener.onInterestRegistered(new InterestRegisteredEvent(7L));
        release.countDown();
        verify(service, timeout(1000).times(1)).analyzeInterestedItemById(7L);
        long deadline = System.currentTimeMillis() + 1000;
        while (!tracker.inProgressAmong(List.of(7L)).isEmpty() && System.currentTimeMillis() < deadline) {
            Thread.sleep(10);
        }

        listener.onInterestRegistered(new InterestRegisteredEvent(7L));
        verify(service, timeout(1000).times(2)).analyzeInterestedItemById(7L);
        listener.shutdown();
    }
}
