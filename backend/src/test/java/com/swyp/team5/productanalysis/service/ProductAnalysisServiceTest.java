package com.swyp.team5.productanalysis.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.ai.chat.client.ChatClient;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.PlatformListingRepository;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.productanalysis.config.ProductAnalysisProperties;
import com.swyp.team5.productanalysis.dto.MarketAnalysisResult;
import com.swyp.team5.productanalysis.dto.ProductAnalysisResponse;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 시세 분석 Service 단위 테스트.
@ExtendWith(MockitoExtension.class)
class ProductAnalysisServiceTest {

    private static final ProductAnalysisProperties PROPERTIES = new ProductAnalysisProperties(3, 24, 30, 0L);

    private final ChatClient geminiAiClient = mock(ChatClient.class, RETURNS_DEEP_STUBS);

    @Mock
    private ProductRepository productRepository;

    @Mock
    private PlatformListingRepository platformListingRepository;

    @Mock
    private ProductAnalysisRepository productAnalysisRepository;

    private ProductAnalysisService service() {
        return new ProductAnalysisService(
                geminiAiClient, productRepository, platformListingRepository, productAnalysisRepository, PROPERTIES);
    }

    private static Product product(Long productId, Long categoryId, Long price) {
        Category category = mock(Category.class);
        lenient().when(category.getId()).thenReturn(categoryId);
        Product product = mock(Product.class);
        lenient().when(product.getId()).thenReturn(productId);
        lenient().when(product.getCategory()).thenReturn(category);
        lenient().when(product.getTitle()).thenReturn("아이패드 프로");
        lenient().when(product.getPrice()).thenReturn(price);
        lenient().when(product.getCondition()).thenReturn(ProductCondition.A);
        return product;
    }

    private static PlatformListing listing(String title, long price) {
        PlatformListing listing = mock(PlatformListing.class);
        lenient().when(listing.getTitle()).thenReturn(title);
        lenient().when(listing.getPrice()).thenReturn(price);
        return listing;
    }

    // 분석 건너뜀 - 비교 매물이 최소 기준(3건)보다 적음
    @Test
    void analyzeProductSkipsWhenComparableListingsBelowThreshold() {
        Product product = product(1L, 10L, 800_000L);
        List<PlatformListing> listings = List.of(listing("매물1", 1000L), listing("매물2", 2000L));
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(10L), eq("SELLING"), any()))
                .thenReturn(listings);

        service().analyzeProduct(product);

        verify(productAnalysisRepository, never()).save(any());
        verify(productAnalysisRepository, never()).findFirstByProductIdOrderByAnalyzedAtDesc(any());
    }

    // 분석 성공 - 통계 계산 + AI 결과 반영 + 직전 스냅샷 대비 변동률 계산
    @Test
    void analyzeProductSavesSnapshotWithStatsAiResultAndChangeRate() {
        Product product = product(1L, 10L, 800_000L);
        List<PlatformListing> listings = List.of(
                listing("매물1", 1000L),
                listing("매물2", 2000L),
                listing("매물3", 3000L),
                listing("매물4", 4000L),
                listing("매물5", 5000L));
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(10L), eq("SELLING"), any()))
                .thenReturn(listings);
        ProductAnalysis previous = mock(ProductAnalysis.class);
        when(previous.getAveragePrice()).thenReturn(2000L);
        when(productAnalysisRepository.findFirstByProductIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.of(previous));
        MarketAnalysisResult aiResult =
                new MarketAnalysisResult(AnalysisRecommendation.SELL, 3200L, "시세가 안정적이라 지금 파는 게 좋습니다.");
        when(geminiAiClient
                        .prompt()
                        .system(anyString())
                        .user(anyString())
                        .call()
                        .entity(MarketAnalysisResult.class))
                .thenReturn(aiResult);

        service().analyzeProduct(product);

        ArgumentCaptor<ProductAnalysis> captor = ArgumentCaptor.forClass(ProductAnalysis.class);
        verify(productAnalysisRepository).save(captor.capture());
        ProductAnalysis saved = captor.getValue();
        assertThat(saved.getMinPrice()).isEqualTo(1000L);
        assertThat(saved.getAveragePrice()).isEqualTo(3000L);
        assertThat(saved.getMaxPrice()).isEqualTo(5000L);
        assertThat(saved.getChangeRate()).isEqualByComparingTo(BigDecimal.valueOf(0.5));
        assertThat(saved.getRecommendation()).isEqualTo(AnalysisRecommendation.SELL);
        assertThat(saved.getSuggestedPrice()).isEqualTo(3200L);
        assertThat(saved.getDescription()).isEqualTo("시세가 안정적이라 지금 파는 게 좋습니다.");
    }

    // 분석 성공 - 직전 스냅샷이 없으면 변동률은 null
    @Test
    void analyzeProductLeavesChangeRateNullWhenNoPreviousSnapshot() {
        Product product = product(1L, 10L, 800_000L);
        List<PlatformListing> listings = List.of(listing("매물1", 1000L), listing("매물2", 2000L), listing("매물3", 3000L));
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(10L), eq("SELLING"), any()))
                .thenReturn(listings);
        when(productAnalysisRepository.findFirstByProductIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.empty());
        when(geminiAiClient
                        .prompt()
                        .system(anyString())
                        .user(anyString())
                        .call()
                        .entity(MarketAnalysisResult.class))
                .thenReturn(new MarketAnalysisResult(AnalysisRecommendation.HOLD, 2000L, "설명"));

        service().analyzeProduct(product);

        ArgumentCaptor<ProductAnalysis> captor = ArgumentCaptor.forClass(ProductAnalysis.class);
        verify(productAnalysisRepository).save(captor.capture());
        assertThat(captor.getValue().getChangeRate()).isNull();
    }

    // 배치 - 한 상품이 실패해도 나머지 상품은 계속 분석
    @Test
    void analyzeAllContinuesOtherProductsWhenOneFails() {
        Product failing = product(1L, 10L, 800_000L);
        Product ok = product(2L, 20L, 500_000L);
        when(productRepository.findByStatus(ProductStatus.ON_SALE)).thenReturn(List.of(failing, ok));
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(10L), anyString(), any()))
                .thenThrow(new RuntimeException("DB 오류"));
        List<PlatformListing> listings = List.of(listing("매물1", 1000L), listing("매물2", 2000L), listing("매물3", 3000L));
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(20L), anyString(), any()))
                .thenReturn(listings);
        when(geminiAiClient
                        .prompt()
                        .system(anyString())
                        .user(anyString())
                        .call()
                        .entity(MarketAnalysisResult.class))
                .thenReturn(new MarketAnalysisResult(AnalysisRecommendation.BUY, 1800L, "설명"));

        service().analyzeAll();

        verify(productAnalysisRepository).save(any());
    }

    // 조회 실패 - 존재하지 않는 상품
    @Test
    void getLatestAnalysisThrowsWhenProductNotFound() {
        when(productRepository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> service().getLatestAnalysis(999L)).isInstanceOf(ProductNotFoundException.class);
    }

    // 조회 성공 - 분석 이력이 없으면 필드가 전부 null인 응답
    @Test
    void getLatestAnalysisReturnsEmptyResponseWhenNoSnapshotExists() {
        when(productRepository.existsById(1L)).thenReturn(true);
        when(productAnalysisRepository.findFirstByProductIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.empty());

        ProductAnalysisResponse response = service().getLatestAnalysis(1L);

        assertThat(response).isEqualTo(ProductAnalysisResponse.empty(1L));
    }

    // 조회 성공 - 가장 최근 스냅샷 반환
    @Test
    void getLatestAnalysisReturnsLatestSnapshot() {
        Product product = product(1L, 10L, 800_000L);
        ProductAnalysis analysis = ProductAnalysis.create(
                product,
                1000L,
                3000L,
                5000L,
                BigDecimal.valueOf(0.5),
                AnalysisRecommendation.SELL,
                3200L,
                "설명",
                LocalDateTime.of(2026, 9, 19, 10, 0));
        when(productRepository.existsById(1L)).thenReturn(true);
        when(productAnalysisRepository.findFirstByProductIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.of(analysis));

        ProductAnalysisResponse response = service().getLatestAnalysis(1L);

        assertThat(response.productId()).isEqualTo(1L);
        assertThat(response.recommendation()).isEqualTo(AnalysisRecommendation.SELL);
        assertThat(response.suggestedPrice()).isEqualTo(3200L);
        assertThat(response.averagePrice()).isEqualTo(3000L);
    }
}
