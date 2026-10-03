package com.swyp.team5.productanalysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.swyp.team5.auth.service.RefreshTokenService;
import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.passport.JwtTokenProvider;
import com.swyp.team5.file.service.FileStorageService;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.product.service.ProductAiSearchService;
import com.swyp.team5.product.service.ProductAiService;
import com.swyp.team5.product.service.ProductImageLoader;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.ForecastPeriod;
import com.swyp.team5.productanalysis.entity.PriceForecast;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.PriceForecastRepository;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// 감가 예측 저장(forecast_period enum 매핑)·최상위 카테고리 조회·분석/가격 추이 조회 응답 통합 테스트. 만든 데이터는 직접 정리한다.
@SpringBootTest
@AutoConfigureMockMvc
class PriceForecastTest {

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

    // ProductTest와 같은 목 구성을 써서 스프링 컨텍스트를 재사용한다. 다른 구성(NotificationTest)을 쓰면 그 사이 새 컨텍스트의
    // Flyway clean으로 enum 타입이 다시 만들어져 오래된 컨텍스트의 커넥션이 "cache lookup failed for type"으로 실패한다.
    @MockitoBean
    private RefreshTokenService refreshTokenService;

    @MockitoBean
    private FileStorageService fileStorageService;

    @MockitoBean
    private ProductAiService productAiService;

    @MockitoBean
    private ProductAiSearchService productAiSearchService;

    @MockitoBean
    private ProductImageLoader productImageLoader;

    private Member member;
    private Product product;
    private ProductAnalysis analysis;

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
        priceForecastRepository.deleteAll(priceForecastRepository.findByAnalysisId(analysis.getId()));
        productAnalysisRepository.delete(analysis);
        productRepository.delete(product);
        memberRepository.delete(member);
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
        mockMvc.perform(get("/products/{id}/analysis", product.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.forecasts.length()").value(3))
                .andExpect(jsonPath("$.data.forecasts[0].period").value("1M"))
                .andExpect(jsonPath("$.data.forecasts[0].expectedPrice").value(970_000))
                .andExpect(jsonPath("$.data.forecasts[2].period").value("6M"));
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
            mockMvc.perform(get("/products/{id}/analysis/trend", product.getId())
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.days").value(30))
                    .andExpect(jsonPath("$.data.currentPrice").value(1_000_000))
                    .andExpect(jsonPath("$.data.points.length()").value(2))
                    .andExpect(jsonPath("$.data.points[0].averagePrice").value(1_200_000))
                    .andExpect(jsonPath("$.data.points[1].averagePrice").value(1_000_000))
                    .andExpect(jsonPath("$.data.points[1].analysisCount").value(1))
                    .andExpect(jsonPath("$.data.averagePrice").value(1_100_000))
                    .andExpect(jsonPath("$.data.changeRate").value(-0.1667));

            mockMvc.perform(get("/products/{id}/analysis/trend", product.getId())
                            .param("days", "0")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                    .andExpect(status().isBadRequest());
        } finally {
            productAnalysisRepository.deleteAll(List.of(yesterday, outOfRange));
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
