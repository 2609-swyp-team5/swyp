package com.swyp.team5.productanalysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.passport.JwtTokenProvider;
import com.swyp.team5.item.entity.AnalysisSkipReason;
import com.swyp.team5.item.repository.ItemRepository;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.PlatformListingRepository;
import com.swyp.team5.platform.repository.PlatformRepository;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.productanalysis.dto.AnalysisStep;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.ForecastPeriod;
import com.swyp.team5.productanalysis.entity.PriceForecast;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.PriceForecastRepository;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;
import com.swyp.team5.productanalysis.service.AnalysisProgressTracker;
import com.swyp.team5.support.IntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// 감가 예측 저장(forecast_period enum 매핑)·최상위 카테고리 조회·분석/가격 추이 조회 응답 통합 테스트. 만든 데이터는 직접 정리한다.
class PriceForecastTest extends IntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PriceForecastRepository priceForecastRepository;

    @Autowired
    private ProductAnalysisRepository productAnalysisRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private PlatformRepository platformRepository;

    @Autowired
    private PlatformListingRepository platformListingRepository;

    @Autowired
    private AnalysisProgressTracker progressTracker;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ProductTest와 같은 목 구성을 써서 스프링 컨텍스트를 재사용한다. 다른 구성(NotificationTest)을 쓰면 그 사이 새 컨텍스트의
    // Flyway clean으로 enum 타입이 다시 만들어져 오래된 컨텍스트의 커넥션이 "cache lookup failed for type"으로 실패한다.

    private Member member;
    private Product product;
    private ProductAnalysis analysis;
    private final List<PlatformListing> createdListings = new ArrayList<>();

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.ofLocalSignUp(
                "forecast-" + UUID.randomUUID() + "@example.com", null, "encoded-password", "회원", "forecast", null));
        product = productRepository.save(newProduct(member));
        analysis = productAnalysisRepository.save(ProductAnalysis.create(
                product,
                900_000L,
                1_000_000L,
                1_100_000L,
                null,
                AnalysisRecommendation.HOLD,
                1_000_000L,
                "설명",
                LocalDateTime.now()));
    }

    @AfterEach
    void tearDown() {
        platformListingRepository.deleteAll(createdListings);
        createdListings.clear();
        priceForecastRepository.deleteAll(priceForecastRepository.findByAnalysisId(analysis.getId()));
        productAnalysisRepository.delete(analysis);
        productRepository.delete(product);
        memberRepository.delete(member);
    }

    // 비교 매물 가격을 bigint[]로 저장·조회하고, 분석 조회 응답의 가격 분포를 그 가격으로 셈
    @Test
    void savesListingPricesAndReturnsDistributionFromThem() throws Exception {
        analysis.assignListingPrices(List.of(900_000L, 950_000L, 1_000_000L, 1_000_000L, 1_100_000L));
        productAnalysisRepository.save(analysis);

        assertThat(productAnalysisRepository
                        .findById(analysis.getId())
                        .orElseThrow()
                        .getListingPrices())
                .containsExactly(900_000L, 950_000L, 1_000_000L, 1_000_000L, 1_100_000L);

        String token = jwtTokenProvider.createAccessToken(member.getId(), MemberRole.USER);
        mockMvc.perform(get("/products/{productId}/analysis", product.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.priceDistribution.length()").value(5))
                .andExpect(jsonPath("$.data.priceDistribution[0].count").value(1))
                .andExpect(jsonPath("$.data.priceDistribution[1].count").value(1))
                .andExpect(jsonPath("$.data.priceDistribution[2].count").value(2))
                .andExpect(jsonPath("$.data.priceDistribution[4].count").value(1));
    }

    // 판매 완료 가격 분포 - 같은 카테고리·비슷한 제목·기간 안 SOLD_OUT 매물만 셈(판매중·다른 물건·기간 밖·중복·이상치 제외)
    @Test
    void distributionCountsRecentSimilarSoldListings() throws Exception {
        Category category = product.getCategory();
        Platform platform = platformRepository.findByName("번개장터").orElseThrow();
        for (long price : List.of(900_000L, 950_000L, 1_000_000L, 1_100_000L)) {
            saveListing(platform, category, "감가 예측 테스트 판매합니다", price, "SOLD_OUT");
        }
        saveListing(platform, category, "감가 예측 테스트 팝니다", 1_000_000L, "SOLD_OUT");
        saveListing(platform, category, "감가 예측 테스트 판매합니다", 950_000L, "SOLD_OUT"); // 같은 제목·가격 재등록(중복)
        saveListing(platform, category, "감가 예측 테스트 판매합니다", 10_000_000L, "SOLD_OUT"); // 이상치
        saveListing(platform, category, "감가 예측 테스트 판매합니다", 500_000L, "SELLING"); // 판매중
        saveListing(platform, category, "전혀 다른 물건", 700_000L, "SOLD_OUT"); // 다른 물건
        PlatformListing old = saveListing(platform, category, "감가 예측 테스트 판매합니다", 300_000L, "SOLD_OUT");
        ReflectionTestUtils.setField(old, "lastSeenAt", LocalDateTime.now().minusDays(40)); // 기간 밖
        platformListingRepository.save(old);

        String token = jwtTokenProvider.createAccessToken(member.getId(), MemberRole.USER);
        mockMvc.perform(get("/products/{productId}/analysis/distribution", product.getId())
                        .param("days", "30")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.productId").value(product.getId()))
                .andExpect(jsonPath("$.data.days").value(30))
                .andExpect(jsonPath("$.data.soldCount").value(5))
                .andExpect(jsonPath("$.data.minPrice").value(900_000))
                .andExpect(jsonPath("$.data.averagePrice").value(990_000))
                .andExpect(jsonPath("$.data.maxPrice").value(1_100_000))
                .andExpect(jsonPath("$.data.buckets.length()").value(5))
                .andExpect(jsonPath("$.data.buckets[2].count").value(2))
                .andExpect(jsonPath("$.data.buckets[4].to").value(1_100_000));
    }

    // 판매 완료 가격 분포 - 매물이 없으면 빈 구간, 기간 범위 밖 400, 없는 상품 404, 비로그인 401
    @Test
    void distributionHandlesNoSoldListingsAndErrors() throws Exception {
        String token = jwtTokenProvider.createAccessToken(member.getId(), MemberRole.USER);

        mockMvc.perform(get("/products/{productId}/analysis/distribution", product.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.days").value(90))
                .andExpect(jsonPath("$.data.soldCount").value(0))
                .andExpect(jsonPath("$.data.minPrice").doesNotExist())
                .andExpect(jsonPath("$.data.buckets.length()").value(0));

        mockMvc.perform(get("/products/{productId}/analysis/distribution", product.getId())
                        .param("days", "181")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/products/{productId}/analysis/distribution", Long.MAX_VALUE)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/products/{productId}/analysis/distribution", product.getId()))
                .andExpect(status().isUnauthorized());
    }

    private PlatformListing saveListing(Platform platform, Category category, String title, long price, String status) {
        PlatformListing listing = platformListingRepository.save(PlatformListing.create(
                platform, category, "dist-" + UUID.randomUUID(), title, price, status, null, null));
        createdListings.add(listing);
        return listing;
    }

    // 1M/3M/6M을 DB enum으로 저장·조회하고, 분석 조회 응답에 기간 순으로 포함
    @Test
    void savesForecastsAndReturnsThemInAnalysisResponse() throws Exception {
        priceForecastRepository.saveAll(List.of(
                PriceForecast.of(analysis, ForecastPeriod.SIX_MONTHS, 833_000L),
                PriceForecast.of(analysis, ForecastPeriod.ONE_MONTH, 970_000L),
                PriceForecast.of(analysis, ForecastPeriod.THREE_MONTHS, 913_000L)));

        assertThat(priceForecastRepository.findByAnalysisId(analysis.getId()))
                .extracting(PriceForecast::getPeriod)
                .containsExactlyInAnyOrder(
                        ForecastPeriod.ONE_MONTH, ForecastPeriod.THREE_MONTHS, ForecastPeriod.SIX_MONTHS);

        String token = jwtTokenProvider.createAccessToken(member.getId(), MemberRole.USER);
        mockMvc.perform(get("/products/{productId}/analysis", product.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.forecasts.length()").value(3))
                .andExpect(jsonPath("$.data.forecasts[0].period").value("1M"))
                .andExpect(jsonPath("$.data.forecasts[0].expectedPrice").value(970_000))
                .andExpect(jsonPath("$.data.forecasts[2].period").value("6M"))
                // 프론트 화면용 필드 — 요약 지표는 type으로 구분, 가격 분포는 배열
                .andExpect(jsonPath("$.data.summary.type").exists())
                .andExpect(jsonPath("$.data.priceDistribution").isArray())
                .andExpect(jsonPath("$.data.marketExpectedPrice").isNumber())
                .andExpect(jsonPath("$.data.analysisStatus").value("ANALYZED"))
                .andExpect(jsonPath("$.data.analysisSkipReason").doesNotExist());

        mockMvc.perform(get("/products/{productId}/analysis/forecast", product.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.valuationForecast.baseValueRate").value(100))
                .andExpect(
                        jsonPath("$.data.valuationForecast.forecasts.length()").value(3))
                .andExpect(
                        jsonPath("$.data.valuationForecast.forecasts[0].period").value("1M"))
                .andExpect(jsonPath("$.data.valuationForecast.forecasts[0].expectedValue")
                        .value(970_000));

        // 조회 관점은 SELL/BUY만 허용
        mockMvc.perform(get("/products/{productId}/analysis", product.getId())
                        .param("perspective", "OTHER")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    // 가격 추이 조회 - 기간 안 스냅샷만 날짜별로 묶고, 기간 밖(31일 전) 스냅샷은 제외
    @Test
    void returnsDailyPriceTrend() throws Exception {
        ProductAnalysis yesterday = productAnalysisRepository.save(ProductAnalysis.create(
                product,
                800_000L,
                1_200_000L,
                1_300_000L,
                null,
                null,
                null,
                null,
                LocalDateTime.now().minusDays(1)));
        ProductAnalysis outOfRange = productAnalysisRepository.save(ProductAnalysis.create(
                product,
                800_000L,
                2_000_000L,
                2_100_000L,
                null,
                null,
                null,
                null,
                LocalDateTime.now().minusDays(31)));
        try {
            String token = jwtTokenProvider.createAccessToken(member.getId(), MemberRole.USER);
            mockMvc.perform(get("/products/{productId}/analysis/trend", product.getId())
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.currentPrice").value(1_000_000))
                    .andExpect(jsonPath("$.data.priceTrend.period").value("1M"))
                    .andExpect(jsonPath("$.data.priceTrend.comparisonBasis").value("PREVIOUS_TRADING_DAY"))
                    .andExpect(jsonPath("$.data.priceTrend.days").value(30))
                    .andExpect(jsonPath("$.data.priceTrend.points.length()").value(2))
                    .andExpect(
                            jsonPath("$.data.priceTrend.points[0].averagePrice").value(1_200_000))
                    .andExpect(
                            jsonPath("$.data.priceTrend.points[1].averagePrice").value(1_000_000))
                    .andExpect(jsonPath("$.data.priceTrend.points[1].analysisCount")
                            .value(1))
                    .andExpect(jsonPath("$.data.priceTrend.points[1].transactionCount")
                            .isNumber())
                    .andExpect(
                            jsonPath("$.data.priceTrend.points[1].change.rate").isNumber())
                    .andExpect(jsonPath("$.data.priceTrend.averagePrice").value(1_100_000))
                    .andExpect(jsonPath("$.data.priceTrend.changeRate").value(-0.1667));

            mockMvc.perform(get("/products/{productId}/analysis/trend", product.getId())
                            .param("days", "0")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                    .andExpect(status().isBadRequest());
        } finally {
            productAnalysisRepository.deleteAll(List.of(yesterday, outOfRange));
        }
    }

    // 분석 결과가 없으면 분석 상태로 이유를 구분하고, 분석 요청은 건너뛴 지 얼마 안 됐거나 분석 대상이 아니면 분석하지 않음
    @Test
    void returnsAnalysisStatusWhenNotAnalyzedAndHandlesRequests() throws Exception {
        Product fresh = productRepository.save(newProduct(member));
        Product skipped = productRepository.save(newProduct(member));
        Product soldOut = newProduct(member);
        soldOut.changeStatus(ProductStatus.SOLD_OUT);
        soldOut = productRepository.save(soldOut);
        itemRepository.recordAnalysisSkip(skipped.getId(), AnalysisSkipReason.NOT_ENOUGH_SIMILAR, LocalDateTime.now());
        String bearer = "Bearer " + jwtTokenProvider.createAccessToken(member.getId(), MemberRole.USER);
        Member other = memberRepository.save(Member.ofLocalSignUp(
                "forecast-other-" + UUID.randomUUID() + "@example.com", null, "encoded-password", "회원", "other", null));
        String otherBearer = "Bearer " + jwtTokenProvider.createAccessToken(other.getId(), MemberRole.USER);
        try {
            mockMvc.perform(get("/products/{productId}/analysis", fresh.getId())
                            .header(HttpHeaders.AUTHORIZATION, bearer))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.analysisId").doesNotExist())
                    .andExpect(jsonPath("$.data.analysisStatus").value("NOT_ANALYZED"));
            mockMvc.perform(get("/products/{productId}/analysis", skipped.getId())
                            .header(HttpHeaders.AUTHORIZATION, bearer))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.analysisStatus").value("SKIPPED"))
                    .andExpect(jsonPath("$.data.analysisSkipReason").value("NOT_ENOUGH_SIMILAR"))
                    .andExpect(jsonPath("$.data.analysisSkipMessage")
                            .value(AnalysisSkipReason.NOT_ENOUGH_SIMILAR.getMessage()));
            mockMvc.perform(get("/products/{productId}/analysis", soldOut.getId())
                            .header(HttpHeaders.AUTHORIZATION, bearer))
                    .andExpect(jsonPath("$.data.analysisStatus").value("UNAVAILABLE"));

            // 방금 건너뛴 대상은 다시 분석하지 않음
            mockMvc.perform(post("/products/{productId}/analysis", skipped.getId())
                            .header(HttpHeaders.AUTHORIZATION, bearer))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.productId").value(skipped.getId()))
                    .andExpect(jsonPath("$.data.analysisStatus").value("SKIPPED"))
                    .andExpect(jsonPath("$.data.analysisSkipReason").value("NOT_ENOUGH_SIMILAR"));
            mockMvc.perform(post("/products/{productId}/analysis", soldOut.getId())
                            .header(HttpHeaders.AUTHORIZATION, bearer))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.analysisStatus").value("UNAVAILABLE"));
            // 테스트는 분석 대기열(관심 등록 직후 분석)이 꺼져 있어 분석하지 않고 현재 상태를 돌려줌
            mockMvc.perform(post("/products/{productId}/analysis", fresh.getId())
                            .header(HttpHeaders.AUTHORIZATION, bearer))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.analysisStatus").value("NOT_ANALYZED"));

            // 강제 재분석: 방금(10분 안) 건너뛴 본인 상품은 다시 분석하지 않고, 남의 상품이면 403
            mockMvc.perform(post("/products/{productId}/analysis", skipped.getId())
                            .param("force", "true")
                            .header(HttpHeaders.AUTHORIZATION, bearer))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.analysisStatus").value("SKIPPED"));
            mockMvc.perform(post("/products/{productId}/analysis", fresh.getId())
                            .param("force", "true")
                            .header(HttpHeaders.AUTHORIZATION, otherBearer))
                    .andExpect(status().isForbidden());

            mockMvc.perform(post("/products/{productId}/analysis", fresh.getId()))
                    .andExpect(status().isUnauthorized());
            mockMvc.perform(post("/products/{productId}/analysis", Long.MAX_VALUE)
                            .header(HttpHeaders.AUTHORIZATION, bearer))
                    .andExpect(status().isNotFound());
        } finally {
            productRepository.deleteAll(List.of(fresh, skipped, soldOut));
            memberRepository.delete(other);
        }
    }

    // 최하위 카테고리에서 부모를 따라 올라가 최상위(대분류) 이름을 찾음
    @Test
    void findsRootCategoryName() {
        Category leaf = product.getCategory();
        Category root = leaf;
        while (root.getParent() != null) {
            root = root.getParent();
        }
        String expected =
                categoryRepository.findById(root.getId()).orElseThrow().getName();

        assertThat(categoryRepository.findRootName(leaf.getId())).contains(expected);
    }

    // 분석 중이 아니면 분석 결과 구독 스트림이 지금의 결과 1건을 바로 보내고 닫힘
    @Test
    void streamSendsLatestAnalysisImmediatelyWhenNotAnalyzing() throws Exception {
        String token = jwtTokenProvider.createAccessToken(member.getId(), MemberRole.USER);
        MvcResult started = mockMvc.perform(get("/products/{productId}/analysis/stream", product.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(request().asyncStarted())
                .andReturn();
        started.getAsyncResult(5_000);

        List<JsonNode> events = streamEvents(started);
        assertThat(events).hasSize(1);
        assertThat(events.get(0).at("/data/event").asText()).isEqualTo("complete");
        assertThat(events.get(0).at("/data/analysisId").asLong()).isEqualTo(analysis.getId());
        assertThat(events.get(0).at("/data/analysisStatus").asText()).isEqualTo("ANALYZED");
    }

    // 분석 중이면 대기 단계부터 단계 변화를 보내다가, 끝나면 결과를 complete로 보내고 닫힘
    @Test
    void streamWaitsUntilAnalysisFinishes() throws Exception {
        String token = jwtTokenProvider.createAccessToken(member.getId(), MemberRole.USER);
        progressTracker.start(product.getId());
        MvcResult started;
        try {
            started = mockMvc.perform(get("/products/{productId}/analysis/stream", product.getId())
                            .param("perspective", "BUY")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                    .andExpect(request().asyncStarted())
                    .andReturn();
            assertThat(started.getResponse().getContentAsString(StandardCharsets.UTF_8))
                    .doesNotContain("complete");
            progressTracker.stepStarted(product.getId(), AnalysisStep.CANDIDATE_SEARCH);
            progressTracker.stepDone(product.getId(), AnalysisStep.CANDIDATE_SEARCH);
        } finally {
            progressTracker.finish(product.getId());
        }
        started.getAsyncResult(5_000);

        List<JsonNode> events = streamEvents(started);
        assertThat(events).hasSize(4);
        assertThat(events.get(0).at("/data/event").asText()).isEqualTo("step");
        assertThat(events.get(0).at("/data/status").asText()).isEqualTo("WAITING");
        assertThat(events.get(0).at("/message").asText()).isEqualTo("분석 순서를 기다리고 있어요.");
        assertThat(events.get(1).at("/data/step").asText()).isEqualTo("CANDIDATE_SEARCH");
        assertThat(events.get(1).at("/data/status").asText()).isEqualTo("START");
        assertThat(events.get(1).at("/data/index").asInt()).isEqualTo(1);
        assertThat(events.get(1).at("/data/total").asInt()).isEqualTo(AnalysisStep.values().length);
        assertThat(events.get(2).at("/data/status").asText()).isEqualTo("DONE");
        assertThat(events.get(3).at("/data/event").asText()).isEqualTo("complete");
        assertThat(events.get(3).at("/data/analysisId").asLong()).isEqualTo(analysis.getId());
        assertThat(events.get(3).at("/data/analysisStatus").asText()).isEqualTo("ANALYZED");
    }

    // 없는 상품은 스트림을 열기 전에 404, 로그인하지 않으면 401
    @Test
    void streamRejectsUnknownProductAndAnonymous() throws Exception {
        String token = jwtTokenProvider.createAccessToken(member.getId(), MemberRole.USER);
        mockMvc.perform(get("/products/{productId}/analysis/stream", 999_999_999L)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/products/{productId}/analysis/stream", product.getId()))
                .andExpect(status().isUnauthorized());
    }

    private List<JsonNode> streamEvents(MvcResult started) throws Exception {
        String body = mockMvc.perform(asyncDispatch(started))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        List<JsonNode> events = new ArrayList<>();
        for (String block : body.split("\n\n")) {
            StringBuilder data = new StringBuilder();
            for (String line : block.split("\n")) {
                if (line.startsWith("data:")) {
                    data.append(line.substring("data:".length()));
                }
            }
            if (!data.isEmpty()) {
                events.add(objectMapper.readTree(data.toString()));
            }
        }
        return events;
    }

    private Product newProduct(Member owner) {
        Category leaf = categoryRepository.findAll().stream()
                .filter(category -> category.isLeaf() && category.getParent() != null)
                .findFirst()
                .orElseThrow();
        return Product.create(
                owner,
                leaf,
                "감가 예측 테스트 상품",
                null,
                "설명",
                1_000_000L,
                ProductCondition.A,
                DefectStatus.NORMAL,
                null,
                true,
                TradeMethod.DIRECT,
                null,
                null,
                List.of("https://image.example.com/1.png"),
                Set.of(),
                Set.of());
    }
}
