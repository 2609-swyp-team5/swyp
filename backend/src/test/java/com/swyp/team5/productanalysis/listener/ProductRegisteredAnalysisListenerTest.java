package com.swyp.team5.productanalysis.listener;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;

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
}
