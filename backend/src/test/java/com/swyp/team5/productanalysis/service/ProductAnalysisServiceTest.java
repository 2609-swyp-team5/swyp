package com.swyp.team5.productanalysis.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
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
import java.util.stream.LongStream;

import org.springframework.ai.chat.client.ChatClient;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.ai.AiChatExecutor;
import com.swyp.team5.crawl.service.ListingSearchService;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.item.entity.AnalysisSkipReason;
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
import com.swyp.team5.productanalysis.dto.AnalysisPerspective;
import com.swyp.team5.productanalysis.dto.CompetitionLevel;
import com.swyp.team5.productanalysis.dto.MarketAnalysisResult;
import com.swyp.team5.productanalysis.dto.PriceForecastResponse;
import com.swyp.team5.productanalysis.dto.PriceTrendResponse;
import com.swyp.team5.productanalysis.dto.ProductAnalysisResponse;
import com.swyp.team5.productanalysis.dto.ProductCompetitionResponse;
import com.swyp.team5.productanalysis.dto.ProductForecastResponse;
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

    private static final ProductAnalysisProperties PROPERTIES =
            new ProductAnalysisProperties(3, 24, 30, 0L, null, null, null, null, 3);

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

    @Mock
    private ListingSearchService listingSearchService;

    private final AnalysisProgressTracker progressTracker = new AnalysisProgressTracker();

    private ProductAnalysisService service() {
        return service(PROPERTIES);
    }

    private ProductAnalysisService service(ProductAnalysisProperties properties) {
        return new ProductAnalysisService(
                new AiChatExecutor(geminiAiClient, openAiClient),
                productRepository,
                platformListingRepository,
                productAnalysisRepository,
                properties,
                notificationService,
                interestRepository,
                priceForecastRepository,
                categoryRepository,
                itemRepository,
                progressTracker,
                listingSearchService);
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
        lenient()
                .when(product.getCreatedAt())
                .thenReturn(LocalDate.now().minusDays(4).atStartOfDay());
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

    // 관심 등록 직후 분석 - 분석 대상 상태 상품·판매중·예약중 외부 매물만 분석, 최근 6시간 안에 분석했거나 없는 대상은 건너뜀
    @Test
    void analyzeInterestedItemByIdAnalyzesOnlyEligibleItems() {
        Product draft = product(1L, 10L, 800_000L);
        when(draft.getStatus()).thenReturn(ProductStatus.DRAFT);
        Product soldOut = product(2L, 10L, 800_000L);
        when(soldOut.getStatus()).thenReturn(ProductStatus.SOLD_OUT);
        PlatformListing selling = listing(3L, 20L, "아이폰 15 프로", 900_000L);
        when(selling.getStatus()).thenReturn("SELLING");
        PlatformListing soldListing = listing(4L, 20L, "아이폰 15", 700_000L);
        when(soldListing.getStatus()).thenReturn("SOLD_OUT");
        PlatformListing reservedListing = listing(7L, 30L, "아이패드 에어", 500_000L);
        when(reservedListing.getStatus()).thenReturn("RESERVED");
        Product recentlyAnalyzed = product(5L, 10L, 800_000L);
        ProductAnalysis recent = mock(ProductAnalysis.class);
        when(recent.getAnalyzedAt()).thenReturn(LocalDateTime.now().minusHours(1));
        when(itemRepository.findById(1L)).thenReturn(Optional.of(draft));
        when(itemRepository.findById(2L)).thenReturn(Optional.of(soldOut));
        when(itemRepository.findById(3L)).thenReturn(Optional.of(selling));
        when(itemRepository.findById(4L)).thenReturn(Optional.of(soldListing));
        when(itemRepository.findById(5L)).thenReturn(Optional.of(recentlyAnalyzed));
        when(itemRepository.findById(6L)).thenReturn(Optional.empty());
        when(itemRepository.findById(7L)).thenReturn(Optional.of(reservedListing));
        lenient()
                .when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(5L))
                .thenReturn(Optional.of(recent));
        givenListings(10L, List.of(listing("갤럭시 탭 S9", 9000L)));
        givenListings(20L, List.of(listing("갤럭시 S24", 9000L)));
        givenListings(30L, List.of(listing("갤럭시 탭 S8", 9000L)));

        for (long id = 1; id <= 7; id++) {
            service().analyzeInterestedItemById(id);
        }

        // 분석은 DRAFT 상품(카테고리 10)·판매중 매물(카테고리 20)·예약중 매물(카테고리 30) 세 건만 — 모두 후보 부족이라 AI 호출 없이 끝남
        verify(platformListingRepository, times(1))
                .findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(eq(10L), anyString(), any());
        verify(platformListingRepository, times(1))
                .findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(eq(20L), anyString(), any());
        verify(platformListingRepository, times(1))
                .findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(eq(30L), anyString(), any());
        verify(geminiAiClient, never()).prompt();
        // 분석이 끝나면(건너뜀 포함) 진행 중 기록이 남지 않음
        assertThat(progressTracker.inProgressAmong(List.of(1L, 3L, 7L))).isEmpty();
    }

    // 관심 등록 직후 분석 - 마지막 분석이 6시간보다 오래됐으면 다시 분석
    @Test
    void analyzeInterestedItemByIdReanalyzesWhenLastAnalysisIsOld() {
        Product product = product(1L, 10L, 800_000L);
        when(product.getStatus()).thenReturn(ProductStatus.ON_SALE);
        ProductAnalysis old = mock(ProductAnalysis.class);
        when(old.getAnalyzedAt()).thenReturn(LocalDateTime.now().minusHours(7));
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.of(old));
        givenListings(10L, List.of(listing("갤럭시 탭 S9", 9000L)));

        service().analyzeInterestedItemById(1L);

        verify(platformListingRepository)
                .findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(eq(10L), anyString(), any());
    }

    // 관심 등록 직후 분석 - 건너뜀 기준이 0시간이면 방금 분석한 대상도 다시 분석(개발용)
    @Test
    void analyzeInterestedItemByIdAlwaysAnalyzesWhenSkipHoursIsZero() {
        Product product = product(1L, 10L, 800_000L);
        when(product.getStatus()).thenReturn(ProductStatus.ON_SALE);
        ProductAnalysis recent = mock(ProductAnalysis.class);
        lenient().when(recent.getAnalyzedAt()).thenReturn(LocalDateTime.now().minusMinutes(1));
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.of(recent));
        givenListings(10L, List.of(listing("갤럭시 탭 S9", 9000L)));

        service(new ProductAnalysisProperties(3, 24, 30, 0L, 0, null, null, null, 3))
                .analyzeInterestedItemById(1L);

        verify(platformListingRepository)
                .findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(eq(10L), anyString(), any());
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
        // 건너뛴 사유(비교할 판매 글 부족)를 기록
        verify(itemRepository).recordAnalysisSkip(eq(1L), eq(AnalysisSkipReason.NOT_ENOUGH_CANDIDATES), any());
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
        // 건너뛴 사유(같은 물건 판매 글 부족)를 기록하고, 분석 성공이 아니므로 사유를 비우지 않음
        verify(itemRepository).recordAnalysisSkip(eq(1L), eq(AnalysisSkipReason.NOT_ENOUGH_SIMILAR), any());
        verify(itemRepository, never()).clearAnalysisSkip(any());
    }

    // 검색 보탬 - 키워드 후보가 3건 미만이면 AI 호출 전에 상품명으로 검색해 보탠 매물까지 후보로 써서 분석
    @Test
    void analyzeProductSearchesBeforeAiCallWhenCandidatesBelowThreshold() {
        Product product = product(1L, 10L, 800_000L);
        givenListings(10L, List.of(listing("아이패드 프로 매물1", 1000L), listing("갤럭시 탭 S9", 9000L)));
        List<PlatformListing> searched = List.of(
                listing(11L, 99L, "아이패드 프로 검색1", 2000L),
                listing(12L, 99L, "아이패드 프로 검색2", 3000L),
                listing(13L, 99L, "아이패드 프로 검색3", 4000L));
        when(listingSearchService.searchAndSave("아이패드 프로", null, 100)).thenReturn(searched);
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.empty());
        givenAiResult(new MarketAnalysisResult(List.of(1, 2, 3, 4), AnalysisRecommendation.HOLD, 2500L, "설명"));

        service().analyzeProduct(product);

        ArgumentCaptor<ProductAnalysis> captor = ArgumentCaptor.forClass(ProductAnalysis.class);
        verify(productAnalysisRepository).save(captor.capture());
        assertThat(captor.getValue().getMinPrice()).isEqualTo(1000L);
        assertThat(captor.getValue().getAveragePrice()).isEqualTo(2500L);
        assertThat(captor.getValue().getMaxPrice()).isEqualTo(4000L);
        assertThat(captor.getValue().getListingCount()).isEqualTo(4);
        verify(listingSearchService, times(1)).searchAndSave(anyString(), any(), anyInt());
    }

    // 검색 보탬 - AI가 고른 같은 물건이 3건 미만이면 검색 결과에서만 새 후보를 골라 확인된 매물과 함께 AI에 한 번 더 묻고(최대
    // 2회) 그 결과로 분석. 1차 후보에서 밀린 기존 매물(매물4)은 2차 후보에 넣지 않음
    @Test
    void analyzeProductRetriesAiWithSearchedListingsWhenTooFewSimilar() {
        Product product = product(1L, 10L, 800_000L);
        givenListings(
                10L,
                List.of(
                        listing("아이패드 프로 매물1", 1000L),
                        listing("아이패드 프로 매물2", 2000L),
                        listing("아이패드 프로 매물3", 3000L),
                        listing("아이패드 프로 매물4", 9000L)));
        List<PlatformListing> searched =
                List.of(listing(11L, 99L, "아이패드 프로 검색1", 1100L), listing(12L, 99L, "아이패드 프로 검색2", 1200L));
        when(listingSearchService.searchAndSave("아이패드 프로", null, 100)).thenReturn(searched);
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.empty());
        // 1차: 매물1만 같은 물건 → 2차 후보 = [매물1(확인됨), 검색1, 검색2] 중 전부 같은 물건
        when(geminiAiClient
                        .prompt()
                        .system(anyString())
                        .user(anyString())
                        .call()
                        .entity(MarketAnalysisResult.class))
                .thenReturn(
                        new MarketAnalysisResult(List.of(1), AnalysisRecommendation.HOLD, 1000L, "1차"),
                        new MarketAnalysisResult(List.of(1, 2, 3), AnalysisRecommendation.HOLD, 1100L, "2차"));

        // 후보 최대 3건 — 1차 후보 [매물1~3], 2차 후보 [매물1, 검색1, 검색2]
        service(new ProductAnalysisProperties(3, 24, 3, 0L, null, null, null, null, 3))
                .analyzeProduct(product);

        ArgumentCaptor<ProductAnalysis> captor = ArgumentCaptor.forClass(ProductAnalysis.class);
        verify(productAnalysisRepository).save(captor.capture());
        assertThat(captor.getValue().getMinPrice()).isEqualTo(1000L);
        assertThat(captor.getValue().getAveragePrice()).isEqualTo(1100L);
        assertThat(captor.getValue().getMaxPrice()).isEqualTo(1200L);
        assertThat(captor.getValue().getSuggestedPrice()).isEqualTo(1100L); // 2차 AI 응답 사용
    }

    // 검색 보탬 - 검색이 꺼져 있으면 검색하지 않고 건너뜀
    @Test
    void analyzeProductDoesNotSearchWhenSearchFallbackDisabled() {
        Product product = product(1L, 10L, 800_000L);
        givenListings(10L, List.of(listing("아이패드 프로 매물1", 1000L)));

        service(new ProductAnalysisProperties(
                        3, 24, 30, 0L, null, null, null, new ProductAnalysisProperties.SearchFallback(false, 100), 3))
                .analyzeProduct(product);

        verifyNoInteractions(listingSearchService);
        verify(productAnalysisRepository, never()).save(any());
    }

    // 검색 보탬 - 관심 외부 매물 분석은 검색 결과에 섞인 자기 자신과 이미 후보에 있는 매물을 빼고 보탬
    @Test
    void analyzeListingExcludesItselfAndDuplicatesFromSearchResults() {
        PlatformListing target = listing(100L, 10L, "아이패드 프로", 900L);
        PlatformListing existing = listing(1L, 10L, "아이패드 프로 매물1", 1000L);
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(10L), eq("SELLING"), any()))
                .thenReturn(List.of(target, existing));
        List<PlatformListing> searched = List.of(
                target, existing, listing(11L, 99L, "아이패드 프로 검색1", 2000L), listing(12L, 99L, "아이패드 프로 검색2", 3000L));
        when(listingSearchService.searchAndSave("아이패드 프로", null, 100)).thenReturn(searched);
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(100L))
                .thenReturn(Optional.empty());
        // 후보 = [매물1, 검색1, 검색2] — 자신(900원)과 중복(매물1 두 번째)이 들어가면 4번이 생겨 결과가 달라짐
        givenAiResult(new MarketAnalysisResult(List.of(1, 2, 3, 4), AnalysisRecommendation.BUY, 2000L, "설명"));

        service().analyzeListing(target);

        ArgumentCaptor<ProductAnalysis> captor = ArgumentCaptor.forClass(ProductAnalysis.class);
        verify(productAnalysisRepository).save(captor.capture());
        assertThat(captor.getValue().getMinPrice()).isEqualTo(1000L);
        assertThat(captor.getValue().getMaxPrice()).isEqualTo(3000L);
        assertThat(captor.getValue().getListingCount()).isEqualTo(3);
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
        // 1개월 전망 - SELL이라 대기 기간 없음, 감가 예측 1M 값(3,000원)과 "디지털" 기본 감가율(월 -3%)
        assertThat(saved.getWaitPeriod()).isNull();
        assertThat(saved.getExpectedPrice()).isEqualTo(3000L);
        assertThat(saved.getExpectedPriceChangeRate()).isEqualByComparingTo("-0.03");
        // 시세 분석의 적정가는 스냅샷에만 저장하고 상품의 사진 추정가(products.suggested_price)는 건드리지 않음
        verifyNoInteractions(productRepository);
        verify(product, never()).changeSuggestedPrice(any());
        // 직전 추천(HOLD)과 이번 추천(SELL)을 넘겨 전환 알림 판단
        verify(notificationService)
                .notifyRecommendationChanged(product, AnalysisRecommendation.HOLD, AnalysisRecommendation.SELL);
        // 평균 시세가 50% 올랐지만 신뢰도 LOW라 시세 변동 알림은 없음
        verify(notificationService, never())
                .notifyPriceChanged(any(), anyLong(), anyLong(), anyBoolean(), anyBoolean());
    }

    // 시세 변동 알림 - 신뢰도가 LOW가 아니고 평균 시세가 직전보다 5% 이상 변하면 판매자(판매중)·관심 회원에게 알림 요청
    @Test
    void analyzeProductRequestsPriceChangeAlertWhenAverageMovesFivePercent() {
        Product product = product(1L, 10L, 800_000L);
        when(product.getStatus()).thenReturn(ProductStatus.ON_SALE);
        List<PlatformListing> listings = new java.util.ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            listings.add(listing("아이패드 프로 매물" + i, 10_000L + i * 10));
        }
        givenListings(10L, listings);
        ProductAnalysis previous = mock(ProductAnalysis.class);
        when(previous.getAveragePrice()).thenReturn(9_000L);
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.of(previous));
        givenAiResult(new MarketAnalysisResult(
                List.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), AnalysisRecommendation.HOLD, 10_000L, "설명"));

        service().analyzeProduct(product);

        ArgumentCaptor<ProductAnalysis> captor = ArgumentCaptor.forClass(ProductAnalysis.class);
        verify(productAnalysisRepository).save(captor.capture());
        assertThat(captor.getValue().getConfidence()).isNotEqualTo(AnalysisConfidence.LOW);
        long average = captor.getValue().getAveragePrice();
        verify(notificationService)
                .notifyPriceChanged(eq(product), eq(9_000L), eq(average), anyBoolean(), anyBoolean());
    }

    // 시세 변동 알림 - 직전 분석이 없으면(첫 분석) 시세 변동 알림 없음
    @Test
    void analyzeProductSkipsPriceChangeAlertOnFirstAnalysis() {
        Product product = product(1L, 10L, 800_000L);
        List<PlatformListing> listings = new java.util.ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            listings.add(listing("아이패드 프로 매물" + i, 10_000L + i * 10));
        }
        givenListings(10L, listings);
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.empty());
        givenAiResult(new MarketAnalysisResult(
                List.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), AnalysisRecommendation.HOLD, 10_000L, "설명"));

        service().analyzeProduct(product);

        verify(notificationService, never())
                .notifyPriceChanged(any(), anyLong(), anyLong(), anyBoolean(), anyBoolean());
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
        // 1개월 전망 - 추세 기록이 없어 감가 예측 쪽(대기 기간 없음, 감가 예측 1M 값, 기본 감가율 월 -2%)
        assertThat(saved.getWaitPeriod()).isNull();
        assertThat(saved.getExpectedPrice()).isEqualTo(2000L);
        assertThat(saved.getExpectedPriceChangeRate()).isEqualByComparingTo("-0.02");
        // 외부 매물은 우리 상품 제안가 갱신 대상이 아님
        verify(notificationService)
                .notifyListingRecommendationChanged(target, AnalysisRecommendation.WAIT, AnalysisRecommendation.BUY);
    }

    // 관심 외부 매물 분석 - 최소 유사 매물은 interest-min-listings라 1이면 같은 물건 1건만 있어도 신뢰도 LOW로 저장하고 건너뛴 사유를 비움
    @Test
    void analyzeListingUsesInterestMinListings() {
        PlatformListing target = listing(100L, 10L, "아이패드 프로", 900L);
        PlatformListing comparison = listing(1L, 10L, "아이패드 프로 매물1", 1000L);
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(10L), eq("SELLING"), any()))
                .thenReturn(List.of(target, comparison));
        givenAiResult(new MarketAnalysisResult(List.of(1), AnalysisRecommendation.BUY, 1000L, "설명"));

        service(new ProductAnalysisProperties(3, 24, 30, 0L, null, null, null, null, 1))
                .analyzeListing(target);

        ArgumentCaptor<ProductAnalysis> captor = ArgumentCaptor.forClass(ProductAnalysis.class);
        verify(productAnalysisRepository).save(captor.capture());
        assertThat(captor.getValue().getListingCount()).isEqualTo(1);
        assertThat(captor.getValue().getConfidence()).isEqualTo(AnalysisConfidence.LOW);
        verify(itemRepository).clearAnalysisSkip(100L);
        verify(itemRepository, never()).recordAnalysisSkip(any(), any(), any());
    }

    // 관심 등록 직후 분석 - 우리 상품도 interest-min-listings(1) 기준으로 분석(정기 배치 기준 min-listings 3이면 건너뛸 매물 수)
    @Test
    void analyzeInterestedProductUsesInterestMinListings() {
        Product product = product(1L, 10L, 900L);
        when(product.getStatus()).thenReturn(ProductStatus.ON_SALE);
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        givenListings(10L, List.of(listing("아이패드 프로 매물1", 1000L)));
        givenAiResult(new MarketAnalysisResult(List.of(1), AnalysisRecommendation.SELL, 1000L, "설명"));

        service(new ProductAnalysisProperties(3, 24, 30, 0L, 0, null, null, null, 1))
                .analyzeInterestedItemById(1L);

        verify(productAnalysisRepository).save(any());
        verify(itemRepository).clearAnalysisSkip(1L);
    }

    // 관심 외부 매물 분석 - 우리 상품과 같이 최상위 카테고리 기본 감가율로 감가 예측(1M/3M/6M)을 저장하고 1개월 전망을 채움
    @Test
    void analyzeListingSavesDepreciationForecastAndOutlook() {
        PlatformListing target = listing(100L, 10L, "아이패드 프로", 2000L);
        List<PlatformListing> comparisons = List.of(
                listing(1L, 10L, "아이패드 프로 매물1", 1000L),
                listing(2L, 10L, "아이패드 프로 매물2", 3000L),
                listing(3L, 10L, "아이패드 프로 매물3", 5000L));
        when(platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        eq(10L), eq("SELLING"), any()))
                .thenReturn(comparisons);
        when(categoryRepository.findRootName(10L)).thenReturn(Optional.of("디지털"));
        givenAiResult(new MarketAnalysisResult(List.of(1, 2, 3), AnalysisRecommendation.BUY, 3000L, "설명"));

        service().analyzeListing(target);

        // 추세 기록이 없어 "디지털" 기본 감가율(월 -3%)로 평균가 3,000원의 1M/3M/6M 예측가를 1,000원 단위로 저장
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
        // 저장하는 추천은 구매자 관점 그대로(판매가 2,000원이 평균 3,000원보다 33% 저렴 → BUY), 판매자 관점은 비움
        assertThat(saved.getRecommendation()).isEqualTo(AnalysisRecommendation.BUY);
        assertThat(saved.getBuyerRecommendation()).isNull();
        assertThat(saved.getWaitPeriod()).isNull();
        assertThat(saved.getExpectedPrice()).isEqualTo(3000L);
        assertThat(saved.getExpectedPriceChangeRate()).isEqualByComparingTo("-0.03");
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

    // 배치 - 우리 상품 다음으로 관심 등록된 판매중·예약중 외부 매물도 분석
    @Test
    void analyzeAllAlsoAnalyzesInterestedListings() {
        when(productRepository.findByStatusIn(ProductStatus.ANALYSIS_TARGETS)).thenReturn(List.of());
        PlatformListing target = listing(100L, 10L, "아이패드 프로", 900L);
        when(interestRepository.findInterestedListingsByStatusIn(List.of("SELLING", "RESERVED")))
                .thenReturn(List.of(target));
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

    // 감가 예측 조회 - 가장 최근 분석의 예측을 1M/3M/6M 순으로 반환
    @Test
    void getForecastReturnsLatestForecastsSorted() {
        Product product = product(1L, 10L, 800_000L);
        LocalDateTime analyzedAt = LocalDateTime.of(2026, 9, 19, 10, 0);
        ProductAnalysis analysis = ProductAnalysis.create(
                product,
                1000L,
                3000L,
                5000L,
                BigDecimal.valueOf(0.5),
                AnalysisRecommendation.SELL,
                3200L,
                "설명",
                analyzedAt);
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.of(analysis));
        when(priceForecastRepository.findByAnalysisId(analysis.getId()))
                .thenReturn(List.of(
                        PriceForecast.of(analysis, ForecastPeriod.SIX_MONTHS, 2_000L),
                        PriceForecast.of(analysis, ForecastPeriod.ONE_MONTH, 3_000L),
                        PriceForecast.of(analysis, ForecastPeriod.THREE_MONTHS, 2_500L)));

        ProductForecastResponse response = service().getForecast(1L);

        assertThat(response.productId()).isEqualTo(1L);
        assertThat(response.currentPrice()).isEqualTo(800_000L);
        assertThat(response.analyzedAt()).isEqualTo(analyzedAt);
        // 기준 가치는 분석 평균 시세(3,000원), 비율은 기준 대비 %(소수 둘째 자리), 1M/3M/6M 순
        ProductForecastResponse.ValuationForecast valuation = response.valuationForecast();
        assertThat(valuation.baseDate()).isEqualTo(analyzedAt.toLocalDate());
        assertThat(valuation.baseValue()).isEqualTo(3_000L);
        assertThat(valuation.baseValueRate()).isEqualByComparingTo("100");
        assertThat(valuation.forecasts())
                .extracting(ProductForecastResponse.Forecast::period, ProductForecastResponse.Forecast::expectedValue)
                .containsExactly(tuple("1M", 3_000L), tuple("3M", 2_500L), tuple("6M", 2_000L));
        assertThat(valuation.forecasts().get(1).expectedValueRate()).isEqualByComparingTo("83.33");
        assertThat(valuation.forecasts().get(1).expectedChangeRate()).isEqualByComparingTo("-16.67");
        assertThat(valuation.forecasts().get(2).expectedValueRate()).isEqualByComparingTo("66.67");
    }

    // 감가 예측 조회 - 분석 이력이 없으면 상품 ID·현재 등록가만 채우고 예측은 빈 배열
    @Test
    void getForecastReturnsEmptyWhenNoSnapshotExists() {
        Product product = product(1L, 10L, 800_000L);
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.empty());

        ProductForecastResponse response = service().getForecast(1L);

        assertThat(response.productId()).isEqualTo(1L);
        assertThat(response.currentPrice()).isEqualTo(800_000L);
        assertThat(response.analysisId()).isNull();
        assertThat(response.analyzedAt()).isNull();
        // 기준 가치는 현재 등록가, 기준일은 오늘
        assertThat(response.valuationForecast().baseValue()).isEqualTo(800_000L);
        assertThat(response.valuationForecast().baseDate()).isEqualTo(LocalDate.now());
        assertThat(response.valuationForecast().forecasts()).isEmpty();
    }

    // 감가 예측 조회 실패 - 존재하지 않는 상품
    @Test
    void getForecastThrowsWhenProductNotFound() {
        when(itemRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().getForecast(999L)).isInstanceOf(ProductNotFoundException.class);
    }

    // 조회 실패 - 존재하지 않는 상품
    @Test
    void getLatestAnalysisThrowsWhenProductNotFound() {
        when(itemRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().getLatestAnalysis(999L, AnalysisPerspective.SELL))
                .isInstanceOf(ProductNotFoundException.class);
    }

    // 조회 성공 - 분석 이력이 없으면 상품 ID·현재 등록가만 채우고 나머지는 null
    @Test
    void getLatestAnalysisReturnsEmptyResponseWhenNoSnapshotExists() {
        Product product = product(1L, 10L, 800_000L);
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.empty());

        ProductAnalysisResponse response = service().getLatestAnalysis(1L, AnalysisPerspective.SELL);

        assertThat(response.productId()).isEqualTo(1L);
        assertThat(response.currentPrice()).isEqualTo(800_000L);
        assertThat(response.analysisId()).isNull();
        assertThat(response.averagePrice()).isNull();
        assertThat(response.marketPriceDiffRate()).isNull();
        assertThat(response.recommendation()).isNull();
        assertThat(response.forecasts()).isEmpty();
        assertThat(response.marketExpectedPrice()).isNull();
        assertThat(response.priceDistribution()).isEmpty();
        assertThat(response.summary()).isNull();
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

        ProductAnalysisResponse response = service().getLatestAnalysis(1L, AnalysisPerspective.SELL);

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
        assertThat(response.waitPeriod()).isNull();
        assertThat(response.expectedPrice()).isNull();
        assertThat(response.expectedPriceChangeRate()).isNull();
        // 1개월 예상 가격 도입 이전 분석이면 예상 시세는 평균가
        assertThat(response.marketExpectedPrice()).isEqualTo(3000L);
        // 판매 추천(SELL)이면 판매 현황 — 등록 4일 전 0시면 판매 기간 5일(당일 1)
        assertThat(response.summary()).isEqualTo(ProductAnalysisResponse.SaleStats.of(5, 0, 0));
    }

    // 조회 성공 - HOLD 분석은 대기 기간(1M)·1개월 예상 가격·변화율을 반환
    @Test
    void getLatestAnalysisReturnsHoldOutlook() {
        Product product = product(1L, 10L, 800_000L);
        ProductAnalysis analysis = ProductAnalysis.create(
                product,
                400_000L,
                500_000L,
                600_000L,
                null,
                AnalysisRecommendation.HOLD,
                510_000L,
                "설명",
                LocalDateTime.now());
        analysis.assignOutlook(ForecastPeriod.ONE_MONTH, 520_000L, new BigDecimal("0.0400"));
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.of(analysis));

        ProductAnalysisResponse response = service().getLatestAnalysis(1L, AnalysisPerspective.SELL);

        assertThat(response.waitPeriod()).isEqualTo("1M");
        assertThat(response.expectedPrice()).isEqualTo(520_000L);
        assertThat(response.expectedPriceChangeRate()).isEqualByComparingTo("0.04");
        assertThat(response.marketExpectedPrice()).isEqualTo(520_000L);
        // HOLD면 대기 추천 지표 — 대기 1개월 = 30일, 변화율은 %(소수 첫째 자리), 신뢰도 도입 이전이면 0
        ProductAnalysisResponse.WaitRecommendation summary =
                (ProductAnalysisResponse.WaitRecommendation) response.summary();
        assertThat(summary.type()).isEqualTo("WAIT_RECOMMENDATION");
        assertThat(summary.waitPeriodDays()).isEqualTo(30);
        assertThat(summary.expectedPriceChangeRate()).isEqualByComparingTo("4.0");
        assertThat(summary.confidenceScore()).isZero();
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

        ProductAnalysisResponse response = service().getLatestAnalysis(1L, AnalysisPerspective.SELL);

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

        assertThat(service().getLatestAnalysis(1L, AnalysisPerspective.SELL).confidence())
                .isEqualTo(AnalysisConfidence.MEDIUM);
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

        ProductAnalysisResponse response = service().getLatestAnalysis(1L, AnalysisPerspective.SELL);

        assertThat(response.marketPriceDiffRate()).isEqualByComparingTo("11.1"); // 등록가가 평균보다 11.1% 비쌈
    }

    // 조회 성공 - 구매자 관점(BUY)이면 우리 상품도 구매자 추천·근거를 recommendation/description에 담고 대기 지표를 반환
    @Test
    void getLatestAnalysisReturnsBuyerViewForOurProduct() {
        Product product = product(1L, 10L, 500_000L);
        ProductAnalysis analysis = ProductAnalysis.create(
                product,
                400_000L,
                450_000L,
                520_000L,
                null,
                AnalysisRecommendation.SELL,
                470_000L,
                "판매 근거",
                LocalDateTime.now());
        analysis.assignBuyerView(AnalysisRecommendation.WAIT, "구매 근거");
        analysis.assignConfidence(14, AnalysisConfidence.HIGH);
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.of(analysis));

        ProductAnalysisResponse buyer = service().getLatestAnalysis(1L, AnalysisPerspective.BUY);

        assertThat(buyer.recommendation()).isEqualTo(AnalysisRecommendation.WAIT);
        assertThat(buyer.description()).isEqualTo("구매 근거");
        // WAIT은 권장 대기 기간이 없으면 1개월(30일), 신뢰도는 매물 수 기반 비율
        assertThat(buyer.summary()).isEqualTo(ProductAnalysisResponse.WaitRecommendation.of(30, BigDecimal.ZERO, 70));

        ProductAnalysisResponse seller = service().getLatestAnalysis(1L, AnalysisPerspective.SELL);

        assertThat(seller.recommendation()).isEqualTo(AnalysisRecommendation.SELL);
        assertThat(seller.description()).isEqualTo("판매 근거");
        assertThat(seller.summary()).isInstanceOf(ProductAnalysisResponse.SaleStats.class);
    }

    // 조회 성공 - 구매자 관점인데 우리 상품 분석에 구매자 추천이 없으면(관점 분리 이전 분석) 판매자 추천(SELL)으로 대체하지 않고 null
    @Test
    void getLatestAnalysisDoesNotFallBackToSellerRecommendationForBuyer() {
        Product product = product(1L, 10L, 500_000L);
        ProductAnalysis legacy = ProductAnalysis.create(
                product,
                400_000L,
                450_000L,
                520_000L,
                null,
                AnalysisRecommendation.SELL,
                470_000L,
                "판매 근거",
                LocalDateTime.now());
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.of(legacy));

        ProductAnalysisResponse buyer = service().getLatestAnalysis(1L, AnalysisPerspective.BUY);

        assertThat(buyer.analysisId()).isEqualTo(legacy.getId());
        assertThat(buyer.recommendation()).isNull();
        assertThat(buyer.description()).isEmpty();
    }

    // 조회 성공 - 가격 분포는 조회 시점 비교 매물(다른 물건·이상치 제외) 중 분석 최저~최고가 안의 가격을 5구간으로 셈
    @Test
    void getLatestAnalysisReturnsPriceDistribution() {
        Product product = product(1L, 10L, 500_000L);
        ProductAnalysis analysis = ProductAnalysis.create(
                product,
                400_000L,
                450_000L,
                500_000L,
                null,
                AnalysisRecommendation.SELL,
                450_000L,
                "설명",
                LocalDateTime.now());
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(1L))
                .thenReturn(Optional.of(analysis));
        givenListings(
                10L,
                List.of(
                        competitor(11L, "아이패드 프로", 400_000L, 1),
                        competitor(12L, "아이패드 프로", 410_000L, 1),
                        competitor(13L, "아이패드 프로", 450_000L, 1),
                        competitor(14L, "아이패드 프로", 500_000L, 1),
                        competitor(15L, "아이패드 프로", 520_000L, 1), // 분석 최고가 밖
                        competitor(16L, "갤럭시탭", 450_000L, 1))); // 다른 물건

        ProductAnalysisResponse response = service().getLatestAnalysis(1L, AnalysisPerspective.SELL);

        assertThat(response.priceDistribution())
                .containsExactly(
                        new ProductAnalysisResponse.PriceBucket(400_000L, 420_000L, 2),
                        new ProductAnalysisResponse.PriceBucket(420_000L, 440_000L, 0),
                        new ProductAnalysisResponse.PriceBucket(440_000L, 460_000L, 1),
                        new ProductAnalysisResponse.PriceBucket(460_000L, 480_000L, 0),
                        new ProductAnalysisResponse.PriceBucket(480_000L, 500_000L, 1));
    }

    // 가격 분포 - 최저가=최고가면 1구간, 범위가 구간 수보다 좁으면 구간을 줄이고, 가격이 없으면 빈 배열
    @Test
    void priceBucketDistributeEdgeCases() {
        assertThat(ProductAnalysisResponse.PriceBucket.distribute(List.of(100L, 100L), 100L, 100L, 5))
                .containsExactly(new ProductAnalysisResponse.PriceBucket(100L, 100L, 2));
        assertThat(ProductAnalysisResponse.PriceBucket.distribute(List.of(100L, 103L), 100L, 103L, 5))
                .containsExactly(
                        new ProductAnalysisResponse.PriceBucket(100L, 101L, 1),
                        new ProductAnalysisResponse.PriceBucket(101L, 102L, 0),
                        new ProductAnalysisResponse.PriceBucket(102L, 103L, 1));
        assertThat(ProductAnalysisResponse.PriceBucket.distribute(List.of(), 100L, 200L, 5))
                .isEmpty();
    }

    private static final LocalDateTime BASE_TIME = LocalDateTime.of(2026, 10, 1, 0, 0);

    /** 경쟁 매물 — {@code hoursAgo}가 작을수록 최근 수집(등록)된 매물. */
    private static PlatformListing competitor(Long id, String title, long price, long hoursAgo) {
        PlatformListing listing = mock(PlatformListing.class, RETURNS_DEEP_STUBS);
        lenient().when(listing.getId()).thenReturn(id);
        lenient().when(listing.getTitle()).thenReturn(title);
        lenient().when(listing.getPrice()).thenReturn(price);
        lenient().when(listing.getCreatedAt()).thenReturn(BASE_TIME.minusHours(hoursAgo));
        lenient().when(listing.getPlatform().getName()).thenReturn("번개장터");
        lenient().when(listing.getImageUrl()).thenReturn("https://image.example.com/" + id + ".jpg");
        lenient().when(listing.getListingUrl()).thenReturn("https://m.bunjang.co.kr/products/" + id);
        return listing;
    }

    private static List<PlatformListing> competitors(int count, long price) {
        return LongStream.rangeClosed(101, 100 + count)
                .mapToObj(id -> competitor(id, "아이패드 프로", price, id))
                .toList();
    }

    // 경쟁 상품 - 같은 유형만 세고(다른 물건·가격 이상치 제외) 최신 등록 순 3건, 평균 시세는 같은 유형 매물 평균
    @Test
    void getCompetitionCountsSameTypeAndListsLatestListings() {
        Product product = product(1L, 10L, 500_000L);
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        List<PlatformListing> sameCategory = List.of(
                competitor(11L, "아이패드 프로 11", 480_000L, 50),
                competitor(12L, "아이패드 프로 11", 510_000L, 3),
                competitor(13L, "아이패드 프로 11", 530_000L, 1),
                competitor(14L, "아이패드 프로 11", 490_000L, 10),
                competitor(15L, "아이패드 프로 11", 520_000L, 2),
                competitor(16L, "아이패드 프로 11", 470_000L, 100),
                competitor(17L, "갤럭시탭 S9", 300_000L, 0), // 다른 물건
                competitor(18L, "아이패드 프로 11", 3_000_000L, 0)); // 가격 이상치
        givenListings(10L, sameCategory);

        ProductCompetitionResponse response = service().getCompetition(1L);

        assertThat(response.productId()).isEqualTo(1L);
        ProductCompetitionResponse.Competition competition = response.competition();
        assertThat(competition.count()).isEqualTo(6);
        assertThat(competition.level()).isEqualTo(CompetitionLevel.MEDIUM);
        assertThat(competition.levelLabel()).isEqualTo("보통");
        assertThat(competition.items())
                .extracting(ProductCompetitionResponse.Item::productId)
                .containsExactly("13", "15", "12");
        // 같은 유형 6건 평균 500,000원 기준
        ProductCompetitionResponse.Item first = competition.items().get(0);
        assertThat(first.platform()).isEqualTo("BUNJANG");
        assertThat(first.platformName()).isEqualTo("번개장터");
        assertThat(first.listingPrice()).isEqualTo(530_000L);
        assertThat(first.marketAveragePrice()).isEqualTo(500_000L);
        assertThat(first.priceDiffRate()).isEqualByComparingTo("6.00");
        assertThat(first.productUrl()).isEqualTo("https://m.bunjang.co.kr/products/13");
        assertThat(competition.items().get(2).priceDiffRate()).isEqualByComparingTo("2.00");
        // 저장된 시세 분석은 읽지 않음
        verify(productAnalysisRepository, never()).findFirstByItemIdOrderByAnalyzedAtDesc(any());
    }

    // 경쟁 상품 - 같은 유형이 3건 미만이면 평균 시세·차이율은 null
    @Test
    void getCompetitionLeavesAverageNullWhenTooFewListings() {
        Product product = product(1L, 10L, 500_000L);
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        List<PlatformListing> two =
                List.of(competitor(11L, "아이패드 프로", 480_000L, 1), competitor(12L, "아이패드 프로", 520_000L, 2));
        givenListings(10L, two);

        ProductCompetitionResponse.Competition competition =
                service().getCompetition(1L).competition();

        assertThat(competition.count()).isEqualTo(2);
        assertThat(competition.level()).isEqualTo(CompetitionLevel.LOW);
        assertThat(competition.items()).allSatisfy(item -> {
            assertThat(item.marketAveragePrice()).isNull();
            assertThat(item.priceDiffRate()).isNull();
        });
    }

    // 경쟁 상품 - 경쟁 정도 경계(4건 LOW, 5·9건 MEDIUM, 10건 HIGH), 목록은 최대 3건
    @Test
    void getCompetitionLevelBoundaries() {
        Product product = product(1L, 10L, 500_000L);
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));

        for (Object[] expected : new Object[][] {
            {4, CompetitionLevel.LOW},
            {5, CompetitionLevel.MEDIUM},
            {9, CompetitionLevel.MEDIUM},
            {10, CompetitionLevel.HIGH}
        }) {
            List<PlatformListing> listings = competitors((int) expected[0], 500_000L);
            givenListings(10L, listings);

            ProductCompetitionResponse.Competition competition =
                    service().getCompetition(1L).competition();

            assertThat(competition.count()).isEqualTo(expected[0]);
            assertThat(competition.level()).isEqualTo(expected[1]);
            assertThat(competition.items()).hasSize(3);
        }
    }

    // 경쟁 상품 - 같은 유형 매물이 없으면 경쟁 정도 NONE(없음)
    @Test
    void getCompetitionReturnsNoneWhenNoListings() {
        Product product = product(1L, 10L, 500_000L);
        when(itemRepository.findById(1L)).thenReturn(Optional.of(product));
        givenListings(10L, List.of());

        ProductCompetitionResponse.Competition competition =
                service().getCompetition(1L).competition();

        assertThat(competition.count()).isZero();
        assertThat(competition.level()).isEqualTo(CompetitionLevel.NONE);
        assertThat(competition.levelLabel()).isEqualTo("없음");
        assertThat(competition.items()).isEmpty();
    }

    // 경쟁 상품 - 기준이 외부 매물이면 자기 자신은 경쟁 상품에서 뺌
    @Test
    void getCompetitionExcludesItselfForExternalListing() {
        PlatformListing target = listing(100L, 10L, "아이패드 프로", 500_000L);
        when(itemRepository.findById(100L)).thenReturn(Optional.of(target));
        List<PlatformListing> sameCategory =
                List.of(target, competitor(11L, "아이패드 프로", 490_000L, 2), competitor(12L, "아이패드 프로", 520_000L, 1));
        givenListings(10L, sameCategory);

        ProductCompetitionResponse.Competition competition =
                service().getCompetition(100L).competition();

        assertThat(competition.count()).isEqualTo(2);
        assertThat(competition.items())
                .extracting(ProductCompetitionResponse.Item::productId)
                .containsExactly("12", "11");
    }

    // 경쟁 상품 실패 - 존재하지 않는 상품
    @Test
    void getCompetitionThrowsWhenProductNotFound() {
        when(itemRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().getCompetition(999L)).isInstanceOf(ProductNotFoundException.class);
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
        PriceTrendResponse.Trend trend = response.priceTrend();
        assertThat(trend.period()).isEqualTo("1M");
        assertThat(trend.comparisonBasis()).isEqualTo("PREVIOUS_TRADING_DAY");
        assertThat(trend.totalTransactionCount()).isZero();
        assertThat(trend.days()).isEqualTo(30);
        assertThat(trend.from()).isEqualTo(today.minusDays(29));
        assertThat(trend.to()).isEqualTo(today);
        assertThat(trend.points()).isEmpty();
        assertThat(trend.averagePrice()).isNull();
        assertThat(trend.changeRate()).isNull();
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
                        snapshot(product, 850L, 1_000L, 1_200L, day1.atTime(12, 0), 7),
                        snapshot(product, 700L, 950L, 1_000L, day2.atTime(6, 0), 4)));

        PriceTrendResponse.Trend trend = service().getPriceTrend(1L, 7).priceTrend();

        // 비교 매물 수는 그날 분석 중 최대(신뢰도 도입 이전 분석은 제외), 합계는 일별 값의 합
        assertThat(trend.points())
                .containsExactly(
                        new PriceTrendResponse.Point(day1, 1_033L, 7L, 800L, 1_300L, 3, null),
                        new PriceTrendResponse.Point(
                                day2,
                                950L,
                                4L,
                                700L,
                                1_000L,
                                1,
                                new PriceTrendResponse.Change(day1, -83L, new BigDecimal("-8.03"))));
        assertThat(trend.period()).isEqualTo("7D");
        assertThat(trend.totalTransactionCount()).isEqualTo(11L);
        assertThat(trend.averagePrice()).isEqualTo(992L); // (1033 + 950) / 2 = 991.5 → 992
        assertThat(trend.changeRate()).isEqualByComparingTo("-0.0803"); // (950 - 1033) / 1033
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

        ProductAnalysisResponse response = service().getLatestAnalysis(2L, AnalysisPerspective.BUY);

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
        assertThat(response.priceTrend().points().get(1).change())
                .isEqualTo(new PriceTrendResponse.Change(day1, 0L, new BigDecimal("0.00")));
    }

    private static ProductAnalysis snapshot(
            Product product, long minPrice, long averagePrice, long maxPrice, LocalDateTime analyzedAt) {
        return ProductAnalysis.create(
                product, minPrice, averagePrice, maxPrice, null, AnalysisRecommendation.HOLD, null, null, analyzedAt);
    }

    private static ProductAnalysis snapshot(
            Product product,
            long minPrice,
            long averagePrice,
            long maxPrice,
            LocalDateTime analyzedAt,
            int listingCount) {
        ProductAnalysis analysis = snapshot(product, minPrice, averagePrice, maxPrice, analyzedAt);
        analysis.assignConfidence(listingCount, AnalysisConfidence.LOW);
        return analysis;
    }
}
