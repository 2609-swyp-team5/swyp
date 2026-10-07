package com.swyp.team5.productanalysis.scheduler;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.springframework.beans.factory.ObjectProvider;

import com.swyp.team5.productanalysis.listener.InterestRegisteredAnalysisListener;
import com.swyp.team5.productanalysis.listener.ProductRegisteredAnalysisListener;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;
import com.swyp.team5.productanalysis.service.AnalysisProgressTracker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// 분석대기 복구 스케줄러 단위 테스트.
class PendingAnalysisRecoverySchedulerTest {

    private ProductAnalysisRepository repository;
    private AnalysisProgressTracker tracker;
    private ProductRegisteredAnalysisListener productListener;
    private InterestRegisteredAnalysisListener interestListener;

    @BeforeEach
    void setUp() {
        repository = mock(ProductAnalysisRepository.class);
        tracker = new AnalysisProgressTracker();
        productListener = mock(ProductRegisteredAnalysisListener.class);
        interestListener = mock(InterestRegisteredAnalysisListener.class);
        when(productListener.enqueue(anyLong())).thenReturn(true);
        when(interestListener.enqueue(anyLong())).thenReturn(true);
    }

    // 분석 안 된 등록 상품·관심 대상을 각 대기열에 넣고, 분석 중인 대상과 등록 상품 쪽에 이미 넣은 상품은 관심 쪽에 다시 넣지 않음
    @Test
    void enqueuesPendingTargetsExceptRunningAndDuplicates() {
        when(repository.findUnanalyzedProductIds(any(), any())).thenReturn(List.of(1L, 2L));
        when(repository.findUnanalyzedInterestedItemIds(any())).thenReturn(List.of(2L, 3L, 4L));
        tracker.start(4L);

        scheduler(provider(productListener), provider(interestListener)).recoverPending();

        verify(productListener).enqueue(1L);
        verify(productListener).enqueue(2L);
        verify(interestListener, never()).enqueue(2L);
        verify(interestListener).enqueue(3L);
        verify(interestListener, never()).enqueue(4L);
    }

    // 직후 분석이 꺼져 있으면(리스너 빈 없음) 그쪽은 조회하지 않음
    @Test
    void skipsDisabledListeners() {
        when(repository.findUnanalyzedInterestedItemIds(any())).thenReturn(List.of(3L));

        scheduler(provider(null), provider(interestListener)).recoverPending();

        verify(repository, never()).findUnanalyzedProductIds(any(), any());
        verify(interestListener).enqueue(3L);
    }

    private PendingAnalysisRecoveryScheduler scheduler(
            ObjectProvider<ProductRegisteredAnalysisListener> products,
            ObjectProvider<InterestRegisteredAnalysisListener> interests) {
        return new PendingAnalysisRecoveryScheduler(repository, tracker, products, interests, 24);
    }

    @SuppressWarnings("unchecked")
    private static <T> ObjectProvider<T> provider(T bean) {
        ObjectProvider<T> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(bean);
        return provider;
    }
}
