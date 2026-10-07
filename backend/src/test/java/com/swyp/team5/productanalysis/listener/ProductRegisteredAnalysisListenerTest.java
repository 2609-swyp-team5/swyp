package com.swyp.team5.productanalysis.listener;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import com.swyp.team5.product.event.ProductRegisteredEvent;
import com.swyp.team5.productanalysis.service.ProductAnalysisService;
import org.junit.jupiter.api.Test;

// 등록 직후 시세 분석 리스너 단위 테스트.
class ProductRegisteredAnalysisListenerTest {

    // 등록 이벤트를 받으면 별도 스레드에서 그 상품을 분석
    @Test
    void analyzesRegisteredProductInBackground() {
        ProductAnalysisService service = mock(ProductAnalysisService.class);
        ProductRegisteredAnalysisListener listener = new ProductRegisteredAnalysisListener(service);

        listener.onProductRegistered(new ProductRegisteredEvent(7L));

        verify(service, timeout(1000)).analyzeProductById(7L);
        listener.shutdown();
    }

    // 같은 상품이 대기 중이거나 분석 중이면 다시 넣지 않고, 끝난 뒤에는 다시 넣을 수 있음
    @Test
    void skipsSameProductWhileQueuedOrRunning() {
        ProductAnalysisService service = mock(ProductAnalysisService.class);
        CountDownLatch release = new CountDownLatch(1);
        doAnswer(invocation -> release.await(1, TimeUnit.SECONDS)).when(service).analyzeProductById(7L);
        ProductRegisteredAnalysisListener listener = new ProductRegisteredAnalysisListener(service);

        assertThat(listener.enqueue(7L)).isTrue();
        assertThat(listener.enqueue(7L)).isFalse();
        release.countDown();
        verify(service, timeout(1000).times(1)).analyzeProductById(7L);

        long deadline = System.currentTimeMillis() + 1000;
        boolean requeued = false;
        while (!requeued && System.currentTimeMillis() < deadline) {
            requeued = listener.enqueue(7L);
        }
        assertThat(requeued).isTrue();
        verify(service, timeout(1000).times(2)).analyzeProductById(7L);
        listener.shutdown();
    }
}
