package com.swyp.team5.home.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import com.swyp.team5.home.dto.HomeSummaryResponse;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.notification.repository.NotificationRepository;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 홈 요약 Service 단위 테스트 - 상태별 건수, 오늘 추천 알림 기준 시각, 시세 대비 가격 계산.
@ExtendWith(MockitoExtension.class)
class HomeSummaryServiceTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 4, 15, 30);

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductAnalysisRepository productAnalysisRepository;

    @Mock
    private InterestRepository interestRepository;

    @Mock
    private NotificationRepository notificationRepository;

    private HomeSummaryService service() {
        return new HomeSummaryService(
                productRepository, productAnalysisRepository, interestRepository, notificationRepository);
    }

    private static Product product(Long id, ProductStatus status, long price) {
        Product product = mock(Product.class);
        lenient().when(product.getId()).thenReturn(id);
        lenient().when(product.getStatus()).thenReturn(status);
        lenient().when(product.getPrice()).thenReturn(price);
        return product;
    }

    private static ProductAnalysis analysis(Product product, Long averagePrice, LocalDateTime analyzedAt) {
        ProductAnalysis analysis = mock(ProductAnalysis.class);
        lenient().when(analysis.getItem()).thenReturn(product);
        lenient().when(analysis.getAveragePrice()).thenReturn(averagePrice);
        lenient().when(analysis.getAnalyzedAt()).thenReturn(analyzedAt);
        return analysis;
    }

    // 상태별 건수·관심 수·오늘 0시 이후 추천 알림 수, 시세 대비는 판매 완료 제외·평균 시세 있는 물건만 합산
    @Test
    void summarizesProductsInterestsAlertsAndMarketDiff() {
        Product draft = product(1L, ProductStatus.DRAFT, 110_000L);
        Product onSale = product(2L, ProductStatus.ON_SALE, 200_000L);
        Product soldOut = product(3L, ProductStatus.SOLD_OUT, 50_000L);
        Product notAnalyzed = product(4L, ProductStatus.ON_SALE, 999_000L);
        when(productRepository.findByMemberId(7L)).thenReturn(List.of(draft, onSale, soldOut, notAnalyzed));
        List<ProductAnalysis> analyses = List.of(
                analysis(draft, 100_000L, NOW.minusHours(5)),
                analysis(onSale, 200_000L, NOW.minusHours(1)),
                analysis(soldOut, 10_000L, NOW.minusMinutes(10)),
                analysis(notAnalyzed, null, NOW.minusDays(1)));
        when(productAnalysisRepository.findLatestByItemIdIn(List.of(1L, 2L, 3L, 4L)))
                .thenReturn(analyses);
        when(interestRepository.countByMemberId(7L)).thenReturn(3L);
        when(notificationRepository.countByMemberIdAndTypeInAndCreatedAtGreaterThanEqual(
                        eq(7L), anyCollection(), eq(LocalDateTime.of(2026, 10, 4, 0, 0))))
                .thenReturn(2L);

        HomeSummaryResponse response = service().getSummary(7L, NOW);

        assertThat(response.productCount()).isEqualTo(4);
        assertThat(response.productStatusCounts())
                .isEqualTo(Map.of("DRAFT", 1L, "ON_SALE", 2L, "RESERVED", 0L, "SOLD_OUT", 1L));
        assertThat(response.interestCount()).isEqualTo(3L);
        assertThat(response.todayRecommendationCount()).isEqualTo(2L);
        // (110,000 + 200,000) vs (100,000 + 200,000) → +3.3%
        assertThat(response.marketPriceDiffRate()).isEqualByComparingTo(new BigDecimal("3.3"));
        assertThat(response.analyzedProductCount()).isEqualTo(2);
        assertThat(response.lastAnalyzedAt()).isEqualTo(NOW.minusMinutes(10));
    }

    // 등록한 물건이 없으면 0과 null로 채우고 분석 조회는 하지 않음
    @Test
    void returnsEmptySummaryWhenNoProducts() {
        when(productRepository.findByMemberId(7L)).thenReturn(List.of());

        HomeSummaryResponse response = service().getSummary(7L, NOW);

        assertThat(response.productCount()).isZero();
        assertThat(response.productStatusCounts()).containsOnlyKeys("DRAFT", "ON_SALE", "RESERVED", "SOLD_OUT");
        assertThat(response.marketPriceDiffRate()).isNull();
        assertThat(response.analyzedProductCount()).isZero();
        assertThat(response.lastAnalyzedAt()).isNull();
        verify(productAnalysisRepository, never()).findLatestByItemIdIn(any());
    }
}
