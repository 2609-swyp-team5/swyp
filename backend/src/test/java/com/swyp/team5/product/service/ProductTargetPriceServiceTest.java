package com.swyp.team5.product.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;

import com.swyp.team5.notification.service.NotificationService;
import com.swyp.team5.product.dto.ProductTargetPriceResponse;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.error.ProductAccessDeniedException;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 판매자 목표 판매가 Service 단위 테스트.
@ExtendWith(MockitoExtension.class)
class ProductTargetPriceServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductAnalysisRepository productAnalysisRepository;

    @Mock
    private NotificationService notificationService;

    private ProductTargetPriceService service() {
        return new ProductTargetPriceService(productRepository, productAnalysisRepository, notificationService);
    }

    private Product product(Long targetPrice, LocalDateTime notifiedAt, ProductStatus status) {
        Product product = mock(Product.class);
        lenient().when(product.getId()).thenReturn(1L);
        lenient().when(product.getTargetPrice()).thenReturn(targetPrice);
        lenient().when(product.getTargetPriceNotifiedAt()).thenReturn(notifiedAt);
        lenient().when(product.getStatus()).thenReturn(status);
        lenient().when(product.isRegisteredBy(10L)).thenReturn(true);
        lenient().when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        return product;
    }

    private void givenLatestAverage(long averagePrice) {
        ProductAnalysis analysis = mock(ProductAnalysis.class);
        when(analysis.getAveragePrice()).thenReturn(averagePrice);
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.of(analysis));
    }

    // 평균 시세가 목표가 이상이고 아직 안 보냈으면 알림 후 기록
    @Test
    void notifiesOnceWhenAverageReachesTarget() {
        Product product = product(300_000L, null, ProductStatus.ON_SALE);
        when(notificationService.notifySellerTargetPriceReached(product, 300_000L))
                .thenReturn(true);

        assertThat(service().checkAfterAnalysis(1L, 300_000L)).isTrue();

        verify(product).markTargetPriceNotified(any());
    }

    // 이미 보냈으면 다시 보내지 않음, 평균 시세가 목표가 아래로 내려가면 기록을 지움
    @Test
    void skipsWhenAlreadyNotifiedAndResetsWhenBelowTarget() {
        Product product = product(300_000L, LocalDateTime.now(), ProductStatus.ON_SALE);

        assertThat(service().checkAfterAnalysis(1L, 350_000L)).isFalse();
        assertThat(service().checkAfterAnalysis(1L, 290_000L)).isFalse();

        verify(notificationService, never()).notifySellerTargetPriceReached(any(), anyLong());
        verify(product).resetTargetPriceNotified();
    }

    // 목표가 없음·판매 완료·알림 끈 판매자면 기록하지 않음
    @Test
    void skipsWithoutTargetOrSoldOutOrDisabled() {
        product(null, null, ProductStatus.ON_SALE);
        assertThat(service().checkAfterAnalysis(1L, 300_000L)).isFalse();

        product(100_000L, null, ProductStatus.SOLD_OUT);
        assertThat(service().checkAfterAnalysis(1L, 300_000L)).isFalse();

        Product disabled = product(100_000L, null, ProductStatus.ON_SALE);
        when(notificationService.notifySellerTargetPriceReached(disabled, 300_000L))
                .thenReturn(false);
        assertThat(service().checkAfterAnalysis(1L, 300_000L)).isFalse();
        verify(disabled, never()).markTargetPriceNotified(any());
    }

    // 설정 직후 최근 분석 평균가로 바로 확인하고 도달 여부를 응답
    @Test
    void setTargetPriceChecksLatestAnalysis() {
        Product product = product(null, null, ProductStatus.ON_SALE);
        givenLatestAverage(320_000L);
        when(product.getTargetPrice()).thenReturn(300_000L);
        when(notificationService.notifySellerTargetPriceReached(product, 320_000L))
                .thenReturn(true);

        ProductTargetPriceResponse response = service().setTargetPrice(10L, 1L, 300_000L);

        verify(product).changeTargetPrice(300_000L, 320_000L);
        assertThat(response.targetPrice()).isEqualTo(300_000L);
        assertThat(response.averagePrice()).isEqualTo(320_000L);
        assertThat(response.reached()).isTrue();
    }

    // 분석이 없으면 평균가 null·도달 아님
    @Test
    void getTargetPriceWithoutAnalysis() {
        product(300_000L, null, ProductStatus.ON_SALE);
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.empty());

        ProductTargetPriceResponse response = service().getTargetPrice(10L, 1L);

        assertThat(response.averagePrice()).isNull();
        assertThat(response.reached()).isFalse();
    }

    @Test
    void rejectsOtherMembersProduct() {
        Product product = product(null, null, ProductStatus.ON_SALE);

        assertThatThrownBy(() -> service().setTargetPrice(20L, 1L, 300_000L))
                .isInstanceOf(ProductAccessDeniedException.class);
        verify(product, never()).changeTargetPrice(any(), any());
    }
}
