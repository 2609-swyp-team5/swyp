package com.swyp.team5.productanalysis.listener;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;

import com.swyp.team5.interest.event.InterestRegisteredEvent;
import com.swyp.team5.productanalysis.service.ProductAnalysisService;
import org.junit.jupiter.api.Test;

// 관심 등록 직후 시세 분석 리스너 단위 테스트.
class InterestRegisteredAnalysisListenerTest {

    // 관심 등록 이벤트를 받으면 별도 스레드에서 그 대상을 분석
    @Test
    void analyzesInterestedItemInBackground() {
        ProductAnalysisService service = mock(ProductAnalysisService.class);
        InterestRegisteredAnalysisListener listener = new InterestRegisteredAnalysisListener(service);

        listener.onInterestRegistered(new InterestRegisteredEvent(7L));

        verify(service, timeout(1000)).analyzeInterestedItemById(7L);
        listener.shutdown();
    }
}
