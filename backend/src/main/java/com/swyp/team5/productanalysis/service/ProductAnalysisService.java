package com.swyp.team5.productanalysis.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.LongSummaryStatistics;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.ai.AiChatExecutor;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.notification.service.NotificationService;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.PlatformListingRepository;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.productanalysis.config.ProductAnalysisProperties;
import com.swyp.team5.productanalysis.dto.MarketAnalysisResult;
import com.swyp.team5.productanalysis.dto.ProductAnalysisResponse;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.PriceForecast;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.PriceForecastRepository;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;

/**
 * 등록된 상품(또는 관심 등록된 외부 매물)과 같은 카테고리에서 수집된 매물({@link PlatformListing}) 중 <b>같은 물건인
 * 매물만</b> 근거로 시세를 분석해 {@link ProductAnalysis} 스냅샷을 생성한다. 유사 매물 선별은 {@link SimilarListingFilter}
 * (키워드 후보 선별) + AI(같은 물건 번호 선택) 2단계이고, 통계(최저/평균/최고가)는 선별된 매물에서 가격 이상치를 뺀 뒤
 * 직접 계산한다. 추천(SELL/HOLD/BUY/WAIT)/적정가/판단 근거는 AI(Gemini, 실패 시 OpenAI GPT)에게 위임한다.
 */
@Slf4j
@Service
public class ProductAnalysisService {

    private static final String SELLING_STATUS = "SELLING";

    /** 추세 계산에 쓸 이전 분석 기록 기간(일). */
    private static final int TREND_DAYS = 30;

    private static final String SYSTEM_PROMPT =
            """
            너는 중고거래 플랫폼의 시세 분석 AI야. 등록된 상품 1건과, 같은 카테고리에서 최근 수집된 실제
            판매 매물 후보 목록(번호/제목/가격)을 줄게.

            먼저 후보 중 이 상품과 "같은 물건"인 매물의 번호를 모두 골라 similarListingNumbers에 담아.
            같은 물건이란 종류와 모델(세대/시리즈/용량 등 가격을 좌우하는 사양)이 같은 것이야. 단어가 겹쳐도
            액세서리·부품·다른 모델·다른 종류의 물건·묶음 판매는 고르지 마. 같은 물건이 없으면 빈 배열로 둬.
            추천과 적정가는 네가 고른 매물의 가격만 근거로 판단해.

            [이전 분석 추이]는 지난 분석들에서 같은 물건 매물의 평균가가 어떻게 변해 왔는지야. "하락/상승 추세"는
            반드시 이 기록으로만 판단하고, 기록이 없거나 판단 보류면 추세를 지어내지 말고 현재 가격 수준만으로 판단해.

            등록된 상품은 판매 목적으로 등록된 매물이야. 기본적으로 판매자 관점(SELL/HOLD)에서 판단하되,
            시세가 뚜렷하게 하락 추세이거나 등록가가 시세보다 눈에 띄게 저렴하면 지금 관심 있는 구매자에게도
            좋은 타이밍이라는 의미로 BUY를 선택해도 돼. 반대로 시세가 오르는 추세면 구매는 WAIT를 선택해도 돼.
            """;

    private static final String USER_PROMPT_TEMPLATE =
            """
            [분석 대상 상품]
            제목: %s
            브랜드: %s
            등록가: %d원
            상태 등급: %s / 결함 여부: %s

            [같은 카테고리 매물 후보 %d건(번호. 제목: 가격)]
            %s

            [이전 분석 추이(같은 물건 평균가, 일별)]
            %s
            """;

    private static final String LISTING_SYSTEM_PROMPT =
            """
            너는 중고거래 플랫폼의 시세 분석 AI야. 사용자가 구매를 고민하며 관심 등록한 외부 플랫폼 매물 1건과,
            같은 카테고리에서 최근 수집된 실제 판매 매물 후보 목록(번호/제목/가격)을 줄게.

            먼저 후보 중 이 매물과 "같은 물건"인 매물의 번호를 모두 골라 similarListingNumbers에 담아.
            같은 물건이란 종류와 모델(세대/시리즈/용량 등 가격을 좌우하는 사양)이 같은 것이야. 단어가 겹쳐도
            액세서리·부품·다른 모델·다른 종류의 물건·묶음 판매는 고르지 마. 같은 물건이 없으면 빈 배열로 둬.
            추천과 적정가는 네가 고른 매물의 가격만 근거로 판단해.

            [이전 분석 추이]는 지난 분석들에서 같은 물건 매물의 평균가가 어떻게 변해 왔는지야. "하락/상승 추세"는
            반드시 이 기록으로만 판단하고, 기록이 없거나 판단 보류면 추세를 지어내지 말고 현재 가격 수준만으로 판단해.

            구매자 관점에서만 판단해. 시세 대비 저렴하거나 시세가 오르는 추세라 지금 사는 게 유리하면 BUY,
            시세보다 비싸거나 시세가 내려가는 추세라 기다리는 게 유리하면 WAIT를 선택해. SELL/HOLD는 선택하지 마.
            """;

    private static final String LISTING_USER_PROMPT_TEMPLATE =
            """
            [분석 대상 매물]
            제목: %s
            판매가: %d원

            [같은 카테고리 매물 후보 %d건(번호. 제목: 가격)]
            %s

            [이전 분석 추이(같은 물건 평균가, 일별)]
            %s
            """;

    private final AiChatExecutor aiChatExecutor;
    private final ProductRepository productRepository;
    private final PlatformListingRepository platformListingRepository;
    private final ProductAnalysisRepository productAnalysisRepository;
    private final ProductAnalysisProperties properties;
    private final NotificationService notificationService;
    private final InterestRepository interestRepository;
    private final PriceForecastRepository priceForecastRepository;
    private final CategoryRepository categoryRepository;

    public ProductAnalysisService(
            AiChatExecutor aiChatExecutor,
            ProductRepository productRepository,
            PlatformListingRepository platformListingRepository,
            ProductAnalysisRepository productAnalysisRepository,
            ProductAnalysisProperties properties,
            NotificationService notificationService,
            InterestRepository interestRepository,
            PriceForecastRepository priceForecastRepository,
            CategoryRepository categoryRepository) {
        this.aiChatExecutor = aiChatExecutor;
        this.productRepository = productRepository;
        this.platformListingRepository = platformListingRepository;
        this.productAnalysisRepository = productAnalysisRepository;
        this.properties = properties;
        this.notificationService = notificationService;
        this.interestRepository = interestRepository;
        this.priceForecastRepository = priceForecastRepository;
        this.categoryRepository = categoryRepository;
    }

    /**
     * 상품의 가장 최근 시세 분석 스냅샷을 감가 예측(1M/3M/6M)과 함께 조회한다. 분석 이력이 없으면(배치가 아직 안 돌았거나 비교
     * 매물 부족으로 건너뛴 경우) 상품 ID·현재 등록가만 채우고 나머지 필드는 null인 응답을 반환한다.
     *
     * @throws ProductNotFoundException 존재하지 않는 상품인 경우
     */
    @Transactional(readOnly = true)
    public ProductAnalysisResponse getLatestAnalysis(Long productId) {
        Product product =
                productRepository.findById(productId).orElseThrow(() -> new ProductNotFoundException(productId));
        return productAnalysisRepository
                .findFirstByProductIdOrderByAnalyzedAtDesc(productId)
                .map(analysis -> ProductAnalysisResponse.from(
                        product, analysis, priceForecastRepository.findByAnalysisId(analysis.getId())))
                .orElseGet(() -> ProductAnalysisResponse.empty(product));
    }

    /**
     * 시세 분석 1단계와 같은 기준(같은 카테고리·판매중·최근 수집 매물 중 상품명 키워드가 겹치는 후보, 가격 이상치 제외,
     * 최소 {@code min-listings}건)으로 유사 매물 평균가만 계산한다(AI 호출·저장 없음 — AI 최종 선별이 없어 분석 스냅샷보다
     * 오탐이 조금 섞일 수 있음). 등록 직후나 분석 이력이 없는 상품 상세처럼 시세 분석 스냅샷이 없을 때 사용한다.
     *
     * @param product 평균가를 계산할 상품(카테고리·제목·브랜드 사용)
     * @return 유사 매물이 {@code min-listings}보다 적으면 빈 값
     */
    @Transactional(readOnly = true)
    public Optional<Long> calculateMarketAveragePrice(Product product) {
        List<PlatformListing> candidates = SimilarListingFilter.selectCandidates(
                product.getTitle(),
                product.getBrand(),
                freshSellingListings(product.getCategory().getId()),
                properties.sampleSize());
        List<Long> prices = SimilarListingFilter.removeOutliers(
                candidates.stream().map(PlatformListing::getPrice).toList());
        if (prices.size() < properties.minListings()) {
            return Optional.empty();
        }
        return Optional.of(
                Math.round(prices.stream().mapToLong(Long::longValue).average().orElseThrow()));
    }

    /**
     * 분석 대상 상태({@link ProductStatus#ANALYSIS_TARGETS} — 외부 게시 전 등록 상품 포함)의 상품 전체와, 관심 등록된
     * 판매중 외부 매물 전체를 순회하며 분석한다(스케줄러 진입점). 한 건이 실패해도 나머지는 계속 진행한다.
     */
    public void analyzeAll() {
        List<Product> products = productRepository.findByStatusIn(ProductStatus.ANALYSIS_TARGETS);
        log.info("시세 분석 대상 상품 {}건", products.size());
        for (Product product : products) {
            analyzeProductSafely(product);
            sleepBetweenAiCalls();
        }

        List<PlatformListing> listings = interestRepository.findInterestedListingsByStatus(SELLING_STATUS);
        log.info("시세 분석 대상 관심 외부 매물 {}건", listings.size());
        for (PlatformListing listing : listings) {
            analyzeListingSafely(listing);
            sleepBetweenAiCalls();
        }
    }

    private void analyzeListingSafely(PlatformListing listing) {
        try {
            analyzeListing(listing);
        } catch (Exception e) {
            log.error("외부 매물 {} 시세 분석 중 오류가 발생했습니다.", listing.getId(), e);
        }
    }

    private void analyzeProductSafely(Product product) {
        try {
            analyzeProduct(product);
        } catch (Exception e) {
            log.error("상품 {} 시세 분석 중 오류가 발생했습니다.", product.getId(), e);
        }
    }

    private void sleepBetweenAiCalls() {
        try {
            Thread.sleep(properties.aiCallIntervalMs());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    @Transactional
    void analyzeProduct(Product product) {
        List<PlatformListing> listings =
                freshSellingListings(product.getCategory().getId());

        // 1단계: 상품명 키워드로 후보를 넓게 고른다(후보가 부족하면 AI 호출 없이 건너뜀)
        List<PlatformListing> candidates = SimilarListingFilter.selectCandidates(
                product.getTitle(), product.getBrand(), listings, properties.sampleSize());
        if (candidates.size() < properties.minListings()) {
            log.info(
                    "상품 {}: 같은 카테고리 매물 {}건 중 상품명이 겹치는 후보가 {}건뿐이라 분석을 건너뜁니다(최소 {}건 필요).",
                    product.getId(),
                    listings.size(),
                    candidates.size(),
                    properties.minListings());
            return;
        }

        // 2단계: AI가 후보 중 같은 물건만 고르고(이전 분석 추이를 함께 줘 추세 판단 근거로 씀), 고른 매물에서 가격
        // 이상치를 뺀 뒤 통계를 낸다
        PriceTrend trend =
                PriceTrend.of(snapshots(productAnalysisRepository.findByProductIdAndAnalyzedAtAfterOrderByAnalyzedAtAsc(
                        product.getId(), LocalDateTime.now().minusDays(TREND_DAYS))));
        MarketAnalysisResult aiResult = requestAiAnalysis(product, candidates, trend);
        List<Long> prices =
                SimilarListingFilter.removeOutliers(similarPrices(candidates, aiResult.similarListingNumbers()));
        if (prices.size() < properties.minListings()) {
            log.info(
                    "상품 {}: 후보 {}건 중 같은 물건으로 확인된 매물이 {}건뿐이라 분석을 건너뜁니다(최소 {}건 필요).",
                    product.getId(),
                    candidates.size(),
                    prices.size(),
                    properties.minListings());
            return;
        }

        LongSummaryStatistics stats = prices.stream().mapToLong(Long::longValue).summaryStatistics();
        long minPrice = stats.getMin();
        long averagePrice = Math.round(stats.getAverage());
        long maxPrice = stats.getMax();

        Optional<ProductAnalysis> previous =
                productAnalysisRepository.findFirstByProductIdOrderByAnalyzedAtDesc(product.getId());
        BigDecimal changeRate = previous.map(p -> calculateChangeRate(p.getAveragePrice(), averagePrice))
                .orElse(null);

        ProductAnalysis analysis = ProductAnalysis.create(
                product,
                minPrice,
                averagePrice,
                maxPrice,
                changeRate,
                aiResult.recommendation(),
                aiResult.suggestedPrice(),
                aiResult.description(),
                LocalDateTime.now());
        productAnalysisRepository.save(analysis);
        saveForecasts(
                analysis,
                trend.plus(analysis.getAnalyzedAt(), averagePrice),
                product.getCategory().getId());

        // 시세 분석이 적정가를 냈으면 상품의 AI 제안가도 최신 값으로 갱신(상세/수정 응답의 suggestedPrice)
        if (aiResult.suggestedPrice() != null) {
            productRepository.updateSuggestedPrice(product.getId(), aiResult.suggestedPrice());
        }

        // 추천이 직전 스냅샷과 달라졌으면 판매자(SELL)/관심 등록 회원(BUY)에게 알림
        notificationService.notifyRecommendationChanged(
                product, previous.map(ProductAnalysis::getRecommendation).orElse(null), aiResult.recommendation());
    }

    /**
     * 관심 등록된 외부 매물 1건을 구매자 관점(BUY/WAIT)으로 분석한다. 비교 매물에서 분석 대상 매물 자신은 제외한다.
     * 우리 상품과 달리 AI 적정가로 갱신할 컬럼이 없고, 알림은 관심 등록 회원에게만 간다.
     */
    @Transactional
    void analyzeListing(PlatformListing listing) {
        List<PlatformListing> comparisons = freshSellingListings(
                        listing.getCategory().getId())
                .stream()
                .filter(comparison -> !Objects.equals(comparison.getId(), listing.getId()))
                .toList();

        // 1단계: 매물 제목 키워드로 후보를 넓게 고른다(외부 매물은 브랜드 정보가 없음)
        List<PlatformListing> candidates =
                SimilarListingFilter.selectCandidates(listing.getTitle(), null, comparisons, properties.sampleSize());
        if (candidates.size() < properties.minListings()) {
            log.info(
                    "외부 매물 {}: 같은 카테고리 매물 {}건 중 제목이 겹치는 후보가 {}건뿐이라 분석을 건너뜁니다(최소 {}건 필요).",
                    listing.getId(),
                    comparisons.size(),
                    candidates.size(),
                    properties.minListings());
            return;
        }

        // 2단계: AI가 후보 중 같은 물건만 고르고(이전 분석 추이 포함), 고른 매물에서 가격 이상치를 뺀 뒤 통계를 낸다
        PriceTrend trend =
                PriceTrend.of(snapshots(productAnalysisRepository.findByListingIdAndAnalyzedAtAfterOrderByAnalyzedAtAsc(
                        listing.getId(), LocalDateTime.now().minusDays(TREND_DAYS))));
        MarketAnalysisResult aiResult = requestListingAiAnalysis(listing, candidates, trend);
        if (aiResult.recommendation() != AnalysisRecommendation.BUY
                && aiResult.recommendation() != AnalysisRecommendation.WAIT) {
            log.warn("외부 매물 {}: 구매자 관점이 아닌 추천({})이 와서 저장하지 않습니다.", listing.getId(), aiResult.recommendation());
            return;
        }
        List<Long> prices =
                SimilarListingFilter.removeOutliers(similarPrices(candidates, aiResult.similarListingNumbers()));
        if (prices.size() < properties.minListings()) {
            log.info(
                    "외부 매물 {}: 후보 {}건 중 같은 물건으로 확인된 매물이 {}건뿐이라 분석을 건너뜁니다(최소 {}건 필요).",
                    listing.getId(),
                    candidates.size(),
                    prices.size(),
                    properties.minListings());
            return;
        }

        LongSummaryStatistics stats = prices.stream().mapToLong(Long::longValue).summaryStatistics();
        long minPrice = stats.getMin();
        long averagePrice = Math.round(stats.getAverage());
        long maxPrice = stats.getMax();

        Optional<ProductAnalysis> previous =
                productAnalysisRepository.findFirstByListingIdOrderByAnalyzedAtDesc(listing.getId());
        BigDecimal changeRate = previous.map(p -> calculateChangeRate(p.getAveragePrice(), averagePrice))
                .orElse(null);

        productAnalysisRepository.save(ProductAnalysis.createForListing(
                listing,
                minPrice,
                averagePrice,
                maxPrice,
                changeRate,
                aiResult.recommendation(),
                aiResult.suggestedPrice(),
                aiResult.description(),
                LocalDateTime.now()));

        notificationService.notifyListingRecommendationChanged(
                listing, previous.map(ProductAnalysis::getRecommendation).orElse(null), aiResult.recommendation());
    }

    /** 이번 스냅샷 기준 감가 예측가(1M/3M/6M)를 저장한다({@link DepreciationForecaster}). */
    private void saveForecasts(ProductAnalysis analysis, PriceTrend trend, Long categoryId) {
        String rootCategoryName = categoryRepository.findRootName(categoryId).orElse(null);
        priceForecastRepository.saveAll(
                DepreciationForecaster.forecast(analysis.getAveragePrice(), trend, rootCategoryName).stream()
                        .map(forecast -> PriceForecast.of(analysis, forecast.period(), forecast.expectedPrice()))
                        .toList());
    }

    private MarketAnalysisResult requestListingAiAnalysis(
            PlatformListing listing, List<PlatformListing> candidates, PriceTrend trend) {
        String userPrompt = LISTING_USER_PROMPT_TEMPLATE.formatted(
                listing.getTitle(),
                listing.getPrice(),
                candidates.size(),
                numberedCandidates(candidates),
                trend.toPromptText());

        MarketAnalysisResult result = aiChatExecutor.call("외부 매물 시세 분석", client -> client.prompt()
                .system(LISTING_SYSTEM_PROMPT)
                .user(userPrompt)
                .call()
                .entity(MarketAnalysisResult.class));
        assert result != null;
        return result;
    }

    private MarketAnalysisResult requestAiAnalysis(
            Product product, List<PlatformListing> candidates, PriceTrend trend) {
        String userPrompt = USER_PROMPT_TEMPLATE.formatted(
                product.getTitle(),
                product.getBrand() == null ? "알 수 없음" : product.getBrand(),
                product.getPrice(),
                product.getCondition(),
                defectStatusLabel(product.getDefectStatus()),
                candidates.size(),
                numberedCandidates(candidates),
                trend.toPromptText());

        // Gemini가 실패하면 같은 요청을 OpenAI GPT로 대체 호출
        MarketAnalysisResult result = aiChatExecutor.call("시세 분석", client -> client.prompt()
                .system(SYSTEM_PROMPT)
                .user(userPrompt)
                .call()
                .entity(MarketAnalysisResult.class));
        assert result != null;
        return result;
    }

    private static List<PriceTrend.Snapshot> snapshots(List<ProductAnalysis> analyses) {
        return analyses.stream()
                .map(analysis -> new PriceTrend.Snapshot(analysis.getAnalyzedAt(), analysis.getAveragePrice()))
                .toList();
    }

    /** 같은 카테고리에서 최근 {@code freshness-hours} 안에 확인된 판매중 매물(가격 오름차순). */
    private List<PlatformListing> freshSellingListings(Long categoryId) {
        LocalDateTime freshAfter = LocalDateTime.now().minusHours(properties.freshnessHours());
        return platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                categoryId, SELLING_STATUS, freshAfter);
    }

    /** AI 프롬프트용 후보 목록("1. 제목: 가격원"). 번호는 {@link #similarPrices}에서 다시 매물로 바꾼다. */
    private static String numberedCandidates(List<PlatformListing> candidates) {
        return IntStream.range(0, candidates.size())
                .mapToObj(i -> "%d. %s: %d원"
                        .formatted(
                                i + 1,
                                candidates.get(i).getTitle(),
                                candidates.get(i).getPrice()))
                .collect(Collectors.joining("\n"));
    }

    /** AI가 고른 후보 번호(1부터)를 가격 목록으로 바꾼다. 범위 밖/중복 번호는 무시한다. */
    private static List<Long> similarPrices(List<PlatformListing> candidates, List<Integer> numbers) {
        if (numbers == null) {
            return List.of();
        }
        return numbers.stream()
                .filter(number -> number != null && number >= 1 && number <= candidates.size())
                .distinct()
                .map(number -> candidates.get(number - 1).getPrice())
                .toList();
    }

    /** 결함(하자) 상태를 AI 프롬프트에 넣을 한국어 설명으로 변환한다. */
    private static String defectStatusLabel(DefectStatus defectStatus) {
        return switch (defectStatus) {
            case NORMAL -> "없음";
            case ISSUES -> "있음";
            case UNKNOWN -> "확인 안 됨";
        };
    }

    private static BigDecimal calculateChangeRate(Long previousAveragePrice, long currentAveragePrice) {
        if (previousAveragePrice == null || previousAveragePrice == 0) {
            return null;
        }
        return BigDecimal.valueOf(currentAveragePrice - previousAveragePrice)
                .divide(BigDecimal.valueOf(previousAveragePrice), 4, RoundingMode.HALF_UP);
    }
}
