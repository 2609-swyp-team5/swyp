package com.swyp.team5.productanalysis.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.ai.chat.client.ChatClient;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.ai.AiChatExecutor;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.item.repository.ItemRepository;
import com.swyp.team5.notification.service.NotificationService;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.PlatformListingRepository;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.productanalysis.config.ProductAnalysisProperties;
import com.swyp.team5.productanalysis.dto.MarketAnalysisResult;
import com.swyp.team5.productanalysis.dto.PriceForecastResponse;
import com.swyp.team5.productanalysis.dto.PriceTrendResponse;
import com.swyp.team5.productanalysis.dto.ProductAnalysisResponse;
import com.swyp.team5.productanalysis.entity.AnalysisConfidence;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.ForecastPeriod;
import com.swyp.team5.productanalysis.entity.PriceForecast;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.PriceForecastRepository;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 시세 분석 Service 단위 테스트.
@ExtendWith(MockitoExtension.class)
class ProductAnalysisServiceTest {

    private static final ProductAnalysisProperties PROPERTIES = new ProductAnalysisProperties(3, 24, 30, 0L, null);

    private final ChatClient geminiAiClient = mock(ChatClient.class, RETURNS_DEEP_STUBS);
    private final ChatClient openAiClient = mock(ChatClient.class, RETURNS_DEEP_STUBS);

    @Mock
    private ProductRepository productRepository;

    @Mock
    private PlatformListingRepository platformListingRepository;

    @Mock
    private ProductAnalysisRepository productAnalysisRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private InterestRepository interestRepository;

    @Mock
    private PriceForecastRepository priceForecastRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ItemRepository itemRepository;

    private ProductAnalysisService service() {
        return new ProductAnalysisService(
                new AiChatExecutor(geminiAiClient, openAiClient),
                productRepository,
                platformListingRepository,
                productAnalysisRepository,
                PROPERTIES,
                notificationService,
                interestRepository,
                priceForecastRepository,
                categoryRepository,
                itemRepository);
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
        lenient().when(product.getDefectStatus()).thenReturn(DefectStatus.NORMAL);
        return product;
    }

    private static PlatformListing listing(String title, long price) {
        PlatformListing listing = mock(PlatformListing.class);
        lenient().when(listing.getTitle()).thenReturn(title);
        lenient().when(listing.getPrice()).thenReturn(price);
        return listing;
    }

    private void givenListings(Long categoryId, List<PlatformListing> listings) {
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(categoryId), eq("SELLING"), any()))
                .thenReturn(listings);
    }

    // 유사 매물 평균가 계산 - 상품명이 겹치는 매물만 평균을 반올림해 반환(다른 물건은 제외, AI 호출 없음)
    @Test
    void calculateMarketAveragePriceUsesOnlyListingsSharingProductKeywords() {
        Product product = product(1L, 10L, 800_000L);
        givenListings(
                10L,
                List.of(
                        listing("아이패드 프로 11", 1000L),
                        listing("아이패드 프로 12.9", 2000L),
                        listing("아이패드 프로 급처", 2001L),
                        listing("갤럭시 탭 S9", 9000L)));

        assertThat(service().calculateMarketAveragePrice(product)).contains(1667L);
        verify(geminiAiClient, never()).prompt();
    }

    // 유사 매물 평균가 계산 - 상품명이 겹치는 매물이 최소 기준(3건)보다 적으면 빈 값
    @Test
    void calculateMarketAveragePriceReturnsEmptyWhenSimilarListingsBelowThreshold() {
        Product product = product(1L, 10L, 800_000L);
        givenListings(
                10L,
                List.of(
                        listing("아이패드 프로 11", 1000L),
                        listing("아이패드 프로 12.9", 2000L),
                        listing("갤럭시 탭 S9", 9000L),
                        listing("갤럭시 탭 S8", 8000L)));

        assertThat(service().calculateMarketAveragePrice(product)).isEmpty();
    }

    // 등록 직후 분석 - 분석 대상 상태(DRAFT/ON_SALE)인 상품만 배치와 같은 방식으로 분석(후보 부족이면 AI 호출 없이 건너뜀)
    @Test
    void analyzeProductByIdAnalyzesOnlyAnalysisTargets() {
        Product draft = product(1L, 10L, 800_000L);
        when(draft.getStatus()).thenReturn(ProductStatus.DRAFT);
        Product soldOut = product(2L, 10L, 800_000L);
        when(soldOut.getStatus()).thenReturn(ProductStatus.SOLD_OUT);
        when(productRepository.findById(1L)).thenReturn(Optional.of(draft));
        when(productRepository.findById(2L)).thenReturn(Optional.of(soldOut));
        when(productRepository.findById(3L)).thenReturn(Optional.empty());
        givenListings(10L, List.of(listing("갤럭시 탭 S9", 9000L)));

        service().analyzeProductById(1L);
        service().analyzeProductById(2L); // 판매 완료 — 건너뜀
        service().analyzeProductById(3L); // 삭제됨 — 건너뜀

        verify(platformListingRepository, times(1))
                .findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(eq(10L), anyString(), any());
        verify(geminiAiClient, never()).prompt();
    }

    // 분석 건너뜀 - 같은 카테고리 매물은 충분해도 상품명이 겹치는 후보가 3건 미만이면 AI 호출 없이 건너뜀
    @Test
    void analyzeProductSkipsWithoutAiCallWhenCandidatesBelowThreshold() {
        Product product = product(1L, 10L, 800_000L);
        givenListings(
                10L,
                List.of(
                        listing("아이패드 프로 11", 1000L),
                        listing("갤럭시 탭 S9", 9000L),
                        listing("갤럭시 탭 S8", 8000L),
                        listing("아이패드 케이스", 100L)));

        service().analyzeProduct(product);

        verify(geminiAiClient, never()).prompt();
        verify(productAnalysisRepository, never()).save(any());
    }

    // 분석 성공 - AI가 고른 같은 물건 매물만으로 통계 계산(범위 밖·중복 번호 무시)
    @Test
    void analyzeProductCalculatesStatsFromAiSelectedListingsOnly() {
        Product product = product(1L, 10L, 800_000L);
        givenListings(
                10L,
                List.of(
                        listing("아이패드 프로 매물1", 1000L),
                        listing("아이패드 프로 매물2", 2000L),
                        listing("아이패드 프로 매물3", 3000L),
                        listing("아이패드 프로 매물4", 4000L),
                        listing("아이패드 프로 매물5", 50_000L)));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.empty());
        givenAiResult(new MarketAnalysisResult(List.of(2, 3, 4, 4, 99), AnalysisRecommendation.HOLD, 3000L, "설명"));

        service().analyzeProduct(product);

        ArgumentCaptor<ProductAnalysis> captor = ArgumentCaptor.forClass(ProductAnalysis.class);
        verify(productAnalysisRepository).save(captor.capture());
        assertThat(captor.getValue().getMinPrice()).isEqualTo(2000L);
        assertThat(captor.getValue().getAveragePrice()).isEqualTo(3000L);
        assertThat(captor.getValue().getMaxPrice()).isEqualTo(4000L);
    }

    // 분석 - 이전 6개월 스냅샷의 월별 평균가 추이를 AI 프롬프트에 넣음
    @Test
    void analyzeProductIncludesPreviousTrendInPrompt() {
        Product product = product(1L, 10L, 800_000L);
        givenListings(
                10L,
                List.of(listing("아이패드 프로 매물1", 1000L), listing("아이패드 프로 매물2", 2000L), listing("아이패드 프로 매물3", 3000L)));
        ProductAnalysis old = mock(ProductAnalysis.class);
        when(old.getAnalyzedAt()).thenReturn(LocalDateTime.of(2026, 9, 20, 6, 0));
        when(old.getAveragePrice()).thenReturn(2500L);
        when(productAnalysisRepository.findByItemIdAndAnalyzedAtAfterOrderByAnalyzedAtAsc(eq(1L), any()))
                .thenReturn(List.of(old));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.empty());
        givenAiResult(new MarketAnalysisResult(List.of(1, 2, 3), AnalysisRecommendation.HOLD, 2000L, "설명"));

        service().analyzeProduct(product);

        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(geminiAiClient.prompt().system(anyString()), atLeastOnce()).user(prompt.capture());
        assertThat(prompt.getAllValues().getLast()).contains("[이전 분석 추이", "2026-09: 2,500원(기록 1일)");
    }

    // 분석 건너뜀 - AI가 같은 물건으로 고른 매물이 3건 미만이면 저장·알림 없음
    @Test
    void analyzeProductSkipsWhenAiSelectsTooFewSimilarListings() {
        Product product = product(1L, 10L, 800_000L);
        givenListings(
                10L,
                List.of(listing("아이패드 프로 매물1", 1000L), listing("아이패드 프로 매물2", 2000L), listing("아이패드 프로 매물3", 3000L)));
        givenAiResult(new MarketAnalysisResult(List.of(1), AnalysisRecommendation.SELL, 1000L, "설명"));

        service().analyzeProduct(product);

        verify(productAnalysisRepository, never()).save(any());
        verify(notificationService, never()).notifyRecommendationChanged(any(), any(), any());
    }

    // 분석 건너뜀 - 비교 매물이 최소 기준(3건)보다 적음
    @Test
    void analyzeProductSkipsWhenComparableListingsBelowThreshold() {
        Product product = product(1L, 10L, 800_000L);
        List<PlatformListing> listings = List.of(listing("아이패드 프로 매물1", 1000L), listing("아이패드 프로 매물2", 2000L));
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(10L), eq("SELLING"), any()))
                .thenReturn(listings);

        service().analyzeProduct(product);

        verify(productAnalysisRepository, never()).save(any());
        verify(productAnalysisRepository, never()).findFirstByItemIdOrderByAnalyzedAtDesc(any());
        verify(notificationService, never()).notifyRecommendationChanged(any(), any(), any());
    }

    // 분석 성공 - 통계 계산 + AI 결과 반영 + 직전 스냅샷 대비 변동률 계산
    @Test
    void analyzeProductSavesSnapshotWithStatsAiResultAndChangeRate() {
        Product product = product(1L, 10L, 800_000L);
        List<PlatformListing> listings = List.of(
                listing("아이패드 프로 매물1", 1000L),
                listing("아이패드 프로 매물2", 2000L),
                listing("아이패드 프로 매물3", 3000L),
                listing("아이패드 프로 매물4", 4000L),
                listing("아이패드 프로 매물5", 5000L));
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(10L), eq("SELLING"), any()))
                .thenReturn(listings);
        ProductAnalysis previous = mock(ProductAnalysis.class);
        when(previous.getAveragePrice()).thenReturn(2000L);
        when(previous.getRecommendation()).thenReturn(AnalysisRecommendation.HOLD);
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.of(previous));
        MarketAnalysisResult aiResult = new MarketAnalysisResult(
                List.of(1, 2, 3, 4, 5), AnalysisRecommendation.SELL, 3200L, "시세가 안정적이라 지금 파는 게 좋습니다.");
        when(geminiAiClient
                        .prompt()
                        .system(anyString())
                        .user(anyString())
                        .call()
                        .entity(MarketAnalysisResult.class))
                .thenReturn(aiResult);
        when(categoryRepository.findRootName(10L)).thenReturn(Optional.of("디지털"));

        service().analyzeProduct(product);

        // 감가 예측 - 추세 기록이 없어 "디지털" 기본 감가율(월 -3%)로 1M/3M/6M 예측가를 1,000원 단위로 저장
        ArgumentCaptor<List<PriceForecast>> forecastCaptor = ArgumentCaptor.captor();
        verify(priceForecastRepository).saveAll(forecastCaptor.capture());
        assertThat(forecastCaptor.getValue())
                .extracting(PriceForecast::getPeriod, PriceForecast::getExpectedPrice)
                .containsExactly(
                        tuple(ForecastPeriod.ONE_MONTH, 3000L),
                        tuple(ForecastPeriod.THREE_MONTHS, 3000L),
                        tuple(ForecastPeriod.SIX_MONTHS, 2000L));

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
        // 신뢰도 - 통계에 쓴 매물 5건(비율 25%)이라 LOW
        assertThat(saved.getListingCount()).isEqualTo(5);
        assertThat(saved.getConfidence()).isEqualTo(AnalysisConfidence.LOW);
        // 시세 분석의 적정가는 스냅샷에만 저장하고 상품의 사진 추정가(products.suggested_price)는 건드리지 않음
        verifyNoInteractions(productRepository);
        verify(product, never()).changeSuggestedPrice(any());
        // 직전 추천(HOLD)과 이번 추천(SELL)을 넘겨 전환 알림 판단
        verify(notificationService)
                .notifyRecommendationChanged(product, AnalysisRecommendation.HOLD, AnalysisRecommendation.SELL);
    }

    // 분석 성공 - Gemini 호출이 실패하면 GPT 결과로 저장
    @Test
    void analyzeProductFallsBackToGptWhenGeminiFails() {
        Product product = product(1L, 10L, 800_000L);
        List<PlatformListing> listings =
                List.of(listing("아이패드 프로 매물1", 1000L), listing("아이패드 프로 매물2", 2000L), listing("아이패드 프로 매물3", 3000L));
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(10L), eq("SELLING"), any()))
                .thenReturn(listings);
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.empty());
        when(geminiAiClient.prompt()).thenThrow(new IllegalStateException("503 UNAVAILABLE"));
        when(openAiClient.prompt().system(anyString()).user(anyString()).call().entity(MarketAnalysisResult.class))
                .thenReturn(
                        new MarketAnalysisResult(List.of(1, 2, 3, 4, 5), AnalysisRecommendation.SELL, 2100L, "GPT 판단"));

        service().analyzeProduct(product);

        ArgumentCaptor<ProductAnalysis> captor = ArgumentCaptor.forClass(ProductAnalysis.class);
        verify(productAnalysisRepository).save(captor.capture());
        assertThat(captor.getValue().getDescription()).isEqualTo("GPT 판단");
        assertThat(captor.getValue().getSuggestedPrice()).isEqualTo(2100L);
    }

    // 분석 성공 - 판매자/구매자 관점을 따로 저장하고, AI 추천이 규칙과 같으면 AI 근거 문장을 그대로 씀
    @Test
    void analyzeProductStoresSellerAndBuyerViews() {
        Product product = product(1L, 10L, 1_900L);
        List<PlatformListing> listings =
                List.of(listing("아이패드 프로 매물1", 1000L), listing("아이패드 프로 매물2", 2000L), listing("아이패드 프로 매물3", 3000L));
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(10L), eq("SELLING"), any()))
                .thenReturn(listings);
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.empty());
        givenAiResult(new MarketAnalysisResult(
                List.of(1, 2, 3), AnalysisRecommendation.SELL, 2000L, "판매 근거", AnalysisRecommendation.BUY, "구매 근거"));

        service().analyzeProduct(product);

        ArgumentCaptor<ProductAnalysis> captor = ArgumentCaptor.forClass(ProductAnalysis.class);
        verify(productAnalysisRepository).save(captor.capture());
        ProductAnalysis saved = captor.getValue();
        // 추세 없음 → 판매자 SELL, 등록가 1,900원이 평균 2,000원과 5% 이내 → 구매자 BUY
        assertThat(saved.getRecommendation()).isEqualTo(AnalysisRecommendation.SELL);
        assertThat(saved.getDescription()).isEqualTo("판매 근거");
        assertThat(saved.getBuyerRecommendation()).isEqualTo(AnalysisRecommendation.BUY);
        assertThat(saved.getBuyerDescription()).isEqualTo("구매 근거");
        assertThat(saved.getBuyerViewRecommendation()).isEqualTo(AnalysisRecommendation.BUY);
    }

    // 분석 성공 - 직전 스냅샷이 없으면 변동률은 null
    @Test
    void analyzeProductLeavesChangeRateNullWhenNoPreviousSnapshot() {
        Product product = product(1L, 10L, 800_000L);
        List<PlatformListing> listings =
                List.of(listing("아이패드 프로 매물1", 1000L), listing("아이패드 프로 매물2", 2000L), listing("아이패드 프로 매물3", 3000L));
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(10L), eq("SELLING"), any()))
                .thenReturn(listings);
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.empty());
        when(geminiAiClient
                        .prompt()
                        .system(anyString())
                        .user(anyString())
                        .call()
                        .entity(MarketAnalysisResult.class))
                .thenReturn(new MarketAnalysisResult(List.of(1, 2, 3, 4, 5), AnalysisRecommendation.SELL, 2000L, "설명"));

        service().analyzeProduct(product);

        ArgumentCaptor<ProductAnalysis> captor = ArgumentCaptor.forClass(ProductAnalysis.class);
        verify(productAnalysisRepository).save(captor.capture());
        assertThat(captor.getValue().getChangeRate()).isNull();
        // 첫 분석은 직전 추천이 없음(null) — 판매자 관점(추세 없음 → SELL)·구매자 관점(등록가가 시세보다 비쌈 → WAIT) 각각 알림
        verify(notificationService).notifyRecommendationChanged(product, null, AnalysisRecommendation.SELL);
        verify(notificationService).notifyRecommendationChanged(product, null, AnalysisRecommendation.WAIT);
    }

    // 배치 - 한 상품이 실패해도 나머지 상품은 계속 분석
    @Test
    void analyzeAllContinuesOtherProductsWhenOneFails() {
        Product failing = product(1L, 10L, 800_000L);
        Product ok = product(2L, 20L, 500_000L);
        when(productRepository.findByStatusIn(ProductStatus.ANALYSIS_TARGETS)).thenReturn(List.of(failing, ok));
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(10L), anyString(), any()))
                .thenThrow(new RuntimeException("DB 오류"));
        List<PlatformListing> listings =
                List.of(listing("아이패드 프로 매물1", 1000L), listing("아이패드 프로 매물2", 2000L), listing("아이패드 프로 매물3", 3000L));
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(20L), anyString(), any()))
                .thenReturn(listings);
        when(geminiAiClient
                        .prompt()
                        .system(anyString())
                        .user(anyString())
                        .call()
                        .entity(MarketAnalysisResult.class))
                .thenReturn(new MarketAnalysisResult(List.of(1, 2, 3, 4, 5), AnalysisRecommendation.BUY, 1800L, "설명"));

        service().analyzeAll();

        verify(productAnalysisRepository).save(any());
    }

    private static PlatformListing listing(Long listingId, Long categoryId, String title, long price) {
        Category category = mock(Category.class);
        lenient().when(category.getId()).thenReturn(categoryId);
        PlatformListing listing = listing(title, price);
        lenient().when(listing.getId()).thenReturn(listingId);
        lenient().when(listing.getCategory()).thenReturn(category);
        return listing;
    }

    private void givenAiResult(MarketAnalysisResult result) {
        when(geminiAiClient
                        .prompt()
                        .system(anyString())
                        .user(anyString())
                        .call()
                        .entity(MarketAnalysisResult.class))
                .thenReturn(result);
    }

    // 관심 외부 매물 분석 성공 - 비교 매물에서 자신은 제외하고 통계 계산, 구매자 관점 추천 저장 + 전환 알림
    @Test
    void analyzeListingExcludesItselfAndSavesBuyerRecommendation() {
        PlatformListing target = listing(100L, 10L, "아이패드 프로", 900L);
        List<PlatformListing> listings = List.of(
                target,
                listing(1L, 10L, "아이패드 프로 매물1", 1000L),
                listing(2L, 10L, "아이패드 프로 매물2", 2000L),
                listing(3L, 10L, "아이패드 프로 매물3", 3000L));
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(10L), eq("SELLING"), any()))
                .thenReturn(listings);
        ProductAnalysis previous = mock(ProductAnalysis.class);
        when(previous.getAveragePrice()).thenReturn(1000L);
        when(previous.getRecommendation()).thenReturn(AnalysisRecommendation.WAIT);
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(100L))
                .thenReturn(Optional.of(previous));
        givenAiResult(
                new MarketAnalysisResult(List.of(1, 2, 3, 4, 5), AnalysisRecommendation.BUY, 1900L, "시세보다 저렴해요."));

        service().analyzeListing(target);

        ArgumentCaptor<ProductAnalysis> captor = ArgumentCaptor.forClass(ProductAnalysis.class);
        verify(productAnalysisRepository).save(captor.capture());
        ProductAnalysis saved = captor.getValue();
        assertThat(saved.getListing()).isSameAs(target);
        assertThat(saved.getProduct()).isNull();
        assertThat(saved.getMinPrice()).isEqualTo(1000L);
        assertThat(saved.getAveragePrice()).isEqualTo(2000L);
        assertThat(saved.getMaxPrice()).isEqualTo(3000L);
        assertThat(saved.getChangeRate()).isEqualByComparingTo(BigDecimal.ONE);
        assertThat(saved.getRecommendation()).isEqualTo(AnalysisRecommendation.BUY);
        assertThat(saved.getListingCount()).isEqualTo(3); // 자신을 뺀 비교 매물 3건
        assertThat(saved.getConfidence()).isEqualTo(AnalysisConfidence.LOW);
        // 외부 매물은 우리 상품 제안가 갱신 대상이 아님
        verify(notificationService)
                .notifyListingRecommendationChanged(target, AnalysisRecommendation.WAIT, AnalysisRecommendation.BUY);
    }

    // 관심 외부 매물 분석 건너뜀 - 자신을 빼면 비교 매물이 최소 기준(3건) 미만
    @Test
    void analyzeListingSkipsWhenComparableListingsBelowThresholdExcludingItself() {
        PlatformListing target = listing(100L, 10L, "아이패드 프로", 900L);
        List<PlatformListing> listings =
                List.of(target, listing(1L, 10L, "아이패드 프로 매물1", 1000L), listing(2L, 10L, "아이패드 프로 매물2", 2000L));
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(10L), eq("SELLING"), any()))
                .thenReturn(listings);

        service().analyzeListing(target);

        verify(productAnalysisRepository, never()).save(any());
        verify(notificationService, never()).notifyListingRecommendationChanged(any(), any(), any());
    }

    // 관심 외부 매물 분석 - AI가 판매자 관점(SELL)을 내도 구매자 규칙으로 저장하고, 근거는 규칙 기반 문장으로 바꿈
    @Test
    void analyzeListingAppliesBuyerRuleWhenAiDisagrees() {
        PlatformListing target = listing(100L, 10L, "아이패드 프로", 900L);
        List<PlatformListing> comparisons = List.of(
                listing(1L, 10L, "아이패드 프로 매물1", 1000L),
                listing(2L, 10L, "아이패드 프로 매물2", 2000L),
                listing(3L, 10L, "아이패드 프로 매물3", 3000L));
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(10L), eq("SELLING"), any()))
                .thenReturn(comparisons);
        givenAiResult(new MarketAnalysisResult(List.of(1, 2, 3, 4, 5), AnalysisRecommendation.SELL, 1900L, "설명"));

        service().analyzeListing(target);

        ArgumentCaptor<ProductAnalysis> captor = ArgumentCaptor.forClass(ProductAnalysis.class);
        verify(productAnalysisRepository).save(captor.capture());
        // 판매가 900원이 평균 시세 2,000원보다 55% 저렴 → BUY
        assertThat(captor.getValue().getRecommendation()).isEqualTo(AnalysisRecommendation.BUY);
        assertThat(captor.getValue().getDescription()).contains("55% 저렴");
        assertThat(captor.getValue().getBuyerRecommendation()).isNull();
        verify(notificationService).notifyListingRecommendationChanged(target, null, AnalysisRecommendation.BUY);
    }

    // 배치 - 우리 상품 다음으로 관심 등록된 판매중 외부 매물도 분석
    @Test
    void analyzeAllAlsoAnalyzesInterestedListings() {
        when(productRepository.findByStatusIn(ProductStatus.ANALYSIS_TARGETS)).thenReturn(List.of());
        PlatformListing target = listing(100L, 10L, "아이패드 프로", 900L);
        when(interestRepository.findInterestedListingsByStatus("SELLING")).thenReturn(List.of(target));
        List<PlatformListing> comparisons = List.of(
                listing(1L, 10L, "아이패드 프로 매물1", 1000L),
                listing(2L, 10L, "아이패드 프로 매물2", 2000L),
                listing(3L, 10L, "아이패드 프로 매물3", 3000L));
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(10L), eq("SELLING"), any()))
                .thenReturn(comparisons);
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(100L))
                .thenReturn(Optional.empty());
        givenAiResult(new MarketAnalysisResult(List.of(1, 2, 3, 4, 5), AnalysisRecommendation.BUY, 1800L, "설명"));

        service().analyzeAll();

        verify(productAnalysisRepository).save(any());
        // 판매가 900원이 평균 시세 2,000원보다 저렴해 BUY
        verify(notificationService).notifyListingRecommendationChanged(target, null, AnalysisRecommendation.BUY);
    }

    // 조회 실패 - 존재하지 않는 상품
    @Test
    void getLatestAnalysisThrowsWhenProductNotFound() {
        when(itemRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().getLatestAnalysis(999L)).isInstanceOf(ProductNotFoundException.class);
    }

    // 조회 성공 - 분석 이력이 없으면 상품 ID·현재 등록가만 채우고 나머지는 null
    @Test
    void getLatestAnalysisReturnsEmptyResponseWhenNoSnapshotExists() {
        Product product = product(1L, 10L, 800_000L);
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.empty());

        ProductAnalysisResponse response = service().getLatestAnalysis(1L);

        assertThat(response.productId()).isEqualTo(1L);
        assertThat(response.currentPrice()).isEqualTo(800_000L);
        assertThat(response.analysisId()).isNull();
        assertThat(response.averagePrice()).isNull();
        assertThat(response.marketPriceDiffRate()).isNull();
        assertThat(response.recommendation()).isNull();
        assertThat(response.forecasts()).isEmpty();
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
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.of(analysis));
        when(priceForecastRepository.findByAnalysisId(analysis.getId()))
                .thenReturn(List.of(
                        PriceForecast.of(analysis, ForecastPeriod.SIX_MONTHS, 2_000L),
                        PriceForecast.of(analysis, ForecastPeriod.ONE_MONTH, 3_000L),
                        PriceForecast.of(analysis, ForecastPeriod.THREE_MONTHS, 3_000L)));

        ProductAnalysisResponse response = service().getLatestAnalysis(1L);

        // 감가 예측은 1M/3M/6M 순으로 정렬해 반환
        assertThat(response.forecasts())
                .containsExactly(
                        new PriceForecastResponse("1M", 3_000L),
                        new PriceForecastResponse("3M", 3_000L),
                        new PriceForecastResponse("6M", 2_000L));
        assertThat(response.productId()).isEqualTo(1L);
        assertThat(response.recommendation()).isEqualTo(AnalysisRecommendation.SELL);
        assertThat(response.suggestedPrice()).isEqualTo(3200L);
        assertThat(response.averagePrice()).isEqualTo(3000L);
        assertThat(response.currentPrice()).isEqualTo(800_000L);
        assertThat(response.description()).isEqualTo("설명");
        // 신뢰도 도입 이전 분석(매물 수·등급 없음)은 신뢰도 필드가 null
        assertThat(response.confidence()).isNull();
        assertThat(response.confidenceRate()).isNull();
        assertThat(response.listingCount()).isNull();
    }

    // 조회 성공 - 신뢰도 비율은 매물 수로 계산하고, 분석 후 24시간이 지났으면 등급을 한 단계 낮춤
    @Test
    void getLatestAnalysisReturnsConfidence() {
        Product product = product(1L, 10L, 800_000L);
        ProductAnalysis fresh = ProductAnalysis.create(
                product, 1000L, 3000L, 5000L, null, AnalysisRecommendation.SELL, 3200L, "설명", LocalDateTime.now());
        fresh.assignConfidence(14, AnalysisConfidence.HIGH);
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.of(fresh));

        ProductAnalysisResponse response = service().getLatestAnalysis(1L);

        assertThat(response.confidence()).isEqualTo(AnalysisConfidence.HIGH);
        assertThat(response.confidenceRate()).isEqualTo(70);
        assertThat(response.listingCount()).isEqualTo(14);

        ProductAnalysis stale = ProductAnalysis.create(
                product,
                1000L,
                3000L,
                5000L,
                null,
                AnalysisRecommendation.SELL,
                3200L,
                "설명",
                LocalDateTime.now().minusHours(25));
        stale.assignConfidence(14, AnalysisConfidence.HIGH);
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.of(stale));

        assertThat(service().getLatestAnalysis(1L).confidence()).isEqualTo(AnalysisConfidence.MEDIUM);
    }

    // 조회 성공 - 시세 대비 %는 (등록가-평균가)/평균가×100, 소수 첫째 자리 반올림
    @Test
    void getLatestAnalysisCalculatesMarketPriceDiffRate() {
        Product product = product(1L, 10L, 500_000L);
        ProductAnalysis analysis = ProductAnalysis.create(
                product,
                400_000L,
                450_000L,
                520_000L,
                null,
                AnalysisRecommendation.HOLD,
                470_000L,
                "설명",
                LocalDateTime.of(2026, 9, 30, 10, 0));
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.of(analysis));

        ProductAnalysisResponse response = service().getLatestAnalysis(1L);

        assertThat(response.marketPriceDiffRate()).isEqualByComparingTo("11.1"); // 등록가가 평균보다 11.1% 비쌈
    }

    // 가격 추이 조회 실패 - 존재하지 않는 상품
    @Test
    void getPriceTrendThrowsWhenProductNotFound() {
        when(itemRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().getPriceTrend(999L, 30)).isInstanceOf(ProductNotFoundException.class);
    }

    // 가격 추이 조회 - 오늘 포함 days일 전 0시부터 조회하고, 분석 이력이 없으면 빈 배열·평균/변동률 null
    @Test
    void getPriceTrendReturnsEmptyPointsWhenNoSnapshotExists() {
        Product product = product(1L, 10L, 800_000L);
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        LocalDate today = LocalDate.now();
        when(productAnalysisRepository.findByItemIdAndAnalyzedAtGreaterThanEqualOrderByAnalyzedAtAsc(
                        1L, today.minusDays(29).atStartOfDay()))
                .thenReturn(List.of());

        PriceTrendResponse response = service().getPriceTrend(1L, 30);

        assertThat(response.productId()).isEqualTo(1L);
        assertThat(response.currentPrice()).isEqualTo(800_000L);
        assertThat(response.days()).isEqualTo(30);
        assertThat(response.from()).isEqualTo(today.minusDays(29));
        assertThat(response.to()).isEqualTo(today);
        assertThat(response.points()).isEmpty();
        assertThat(response.averagePrice()).isNull();
        assertThat(response.changeRate()).isNull();
    }

    // 가격 추이 조회 - 같은 날 스냅샷은 하루로 합치고(평균가 평균·최저/최고), 기간 평균은 일별 평균의 평균, 변동률은 첫날→마지막날
    @Test
    void getPriceTrendGroupsSnapshotsByDate() {
        Product product = product(1L, 10L, 800_000L);
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        LocalDate day1 = LocalDate.now().minusDays(2);
        LocalDate day2 = LocalDate.now();
        when(productAnalysisRepository.findByItemIdAndAnalyzedAtGreaterThanEqualOrderByAnalyzedAtAsc(eq(1L), any()))
                .thenReturn(List.of(
                        snapshot(product, 900L, 1_000L, 1_100L, day1.atTime(0, 0)),
                        snapshot(product, 800L, 1_100L, 1_300L, day1.atTime(6, 0)),
                        snapshot(product, 850L, 1_000L, 1_200L, day1.atTime(12, 0)),
                        snapshot(product, 700L, 950L, 1_000L, day2.atTime(6, 0))));

        PriceTrendResponse response = service().getPriceTrend(1L, 30);

        assertThat(response.points())
                .containsExactly(
                        new PriceTrendResponse.Point(day1, 1_033L, 800L, 1_300L, 3, null),
                        new PriceTrendResponse.Point(
                                day2,
                                950L,
                                700L,
                                1_000L,
                                1,
                                new PriceTrendResponse.Change(day1, -83L, new BigDecimal("-8.03"))));
        assertThat(response.averagePrice()).isEqualTo(992L); // (1033 + 950) / 2 = 991.5 → 992
        assertThat(response.changeRate()).isEqualByComparingTo("-0.0803"); // (950 - 1033) / 1033
    }

    // 조회 성공 - 관심 등록된 외부 매물도 같은 ID로 최근 분석·현재 판매가를 조회
    @Test
    void getLatestAnalysisSupportsExternalListing() {
        PlatformListing listing = listing(2L, 10L, "외부 매물", 300_000L);
        ProductAnalysis analysis = ProductAnalysis.createForListing(
                listing,
                250_000L,
                280_000L,
                320_000L,
                null,
                AnalysisRecommendation.BUY,
                270_000L,
                "설명",
                LocalDateTime.of(2026, 10, 1, 6, 0));
        when(itemRepository.findById(2L)).thenReturn(Optional.of(listing));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(2L))
                .thenReturn(Optional.of(analysis));

        ProductAnalysisResponse response = service().getLatestAnalysis(2L);

        assertThat(response.productId()).isEqualTo(2L);
        assertThat(response.currentPrice()).isEqualTo(300_000L);
        assertThat(response.recommendation()).isEqualTo(AnalysisRecommendation.BUY);
    }

    // 가격 추이 조회 - 외부 매물도 조회되고, 직전 기록일과 평균가가 같으면 변화는 0
    @Test
    void getPriceTrendSupportsExternalListing() {
        PlatformListing listing = listing(2L, 10L, "외부 매물", 300_000L);
        when(itemRepository.findById(2L)).thenReturn(Optional.of(listing));
        LocalDate day1 = LocalDate.now().minusDays(1);
        LocalDate day2 = LocalDate.now();
        when(productAnalysisRepository.findByItemIdAndAnalyzedAtGreaterThanEqualOrderByAnalyzedAtAsc(eq(2L), any()))
                .thenReturn(List.of(
                        ProductAnalysis.createForListing(
                                listing,
                                900L,
                                1_000L,
                                1_100L,
                                null,
                                AnalysisRecommendation.WAIT,
                                null,
                                null,
                                day1.atTime(6, 0)),
                        ProductAnalysis.createForListing(
                                listing,
                                900L,
                                1_000L,
                                1_100L,
                                null,
                                AnalysisRecommendation.WAIT,
                                null,
                                null,
                                day2.atTime(6, 0))));

        PriceTrendResponse response = service().getPriceTrend(2L, 30);

        assertThat(response.productId()).isEqualTo(2L);
        assertThat(response.currentPrice()).isEqualTo(300_000L);
        assertThat(response.points().get(1).change())
                .isEqualTo(new PriceTrendResponse.Change(day1, 0L, new BigDecimal("0.00")));
    }

    private static ProductAnalysis snapshot(
            Product product, long minPrice, long averagePrice, long maxPrice, LocalDateTime analyzedAt) {
        return ProductAnalysis.create(
                product, minPrice, averagePrice, maxPrice, null, AnalysisRecommendation.HOLD, null, null, analyzedAt);
    }
}
