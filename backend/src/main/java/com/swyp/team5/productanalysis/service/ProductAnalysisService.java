package com.swyp.team5.productanalysis.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.LongSummaryStatistics;
import java.util.Optional;
import java.util.stream.Collectors;

import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.common.ai.AiChatExecutor;
import com.swyp.team5.notification.service.NotificationService;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.ListingPriceStats;
import com.swyp.team5.platform.repository.PlatformListingRepository;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.productanalysis.config.ProductAnalysisProperties;
import com.swyp.team5.productanalysis.dto.MarketAnalysisResult;
import com.swyp.team5.productanalysis.dto.ProductAnalysisResponse;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;

/**
 * 등록된 상품과 같은 카테고리에서 수집된 매물({@link PlatformListing})을 근거로 시세를 분석해
 * {@link ProductAnalysis} 스냅샷을 생성한다. 통계(최저/평균/최고가)는 직접 계산하고,
 * 추천(SELL/HOLD/BUY/WAIT)/적정가/판단 근거는 AI(Gemini, 실패 시 OpenAI GPT)에게 위임한다.
 */
@Slf4j
@Service
public class ProductAnalysisService {

    private static final String SELLING_STATUS = "SELLING";

    private static final String SYSTEM_PROMPT =
            """
            너는 중고거래 플랫폼의 시세 분석 AI야. 등록된 상품 1건과, 같은 카테고리에서 최근 수집된 실제
            판매 매물 목록(제목/가격)을 줄게. 매물 중 상품명이 이 상품과 실제로 유사한 것들만 참고하고,
            카테고리가 같아도 전혀 다른 종류의 물건은 무시해.

            등록된 상품은 판매 목적으로 등록된 매물이야. 기본적으로 판매자 관점(SELL/HOLD)에서 판단하되,
            시세가 뚜렷하게 하락 추세이거나 등록가가 시세보다 눈에 띄게 저렴하면 지금 관심 있는 구매자에게도
            좋은 타이밍이라는 의미로 BUY를 선택해도 돼. 반대로 시세가 오르는 추세면 구매는 WAIT를 선택해도 돼.
            """;

    private static final String USER_PROMPT_TEMPLATE =
            """
            [분석 대상 상품]
            제목: %s
            카테고리 시세 통계 - 최저가: %d원 / 평균가: %d원 / 최고가: %d원
            등록가: %d원
            상태 등급: %s / 결함 여부: %s

            [같은 카테고리 비교 매물 %d건(가격 오름차순)]
            %s
            """;

    private final AiChatExecutor aiChatExecutor;
    private final ProductRepository productRepository;
    private final PlatformListingRepository platformListingRepository;
    private final ProductAnalysisRepository productAnalysisRepository;
    private final ProductAnalysisProperties properties;
    private final NotificationService notificationService;

    public ProductAnalysisService(
            AiChatExecutor aiChatExecutor,
            ProductRepository productRepository,
            PlatformListingRepository platformListingRepository,
            ProductAnalysisRepository productAnalysisRepository,
            ProductAnalysisProperties properties,
            NotificationService notificationService) {
        this.aiChatExecutor = aiChatExecutor;
        this.productRepository = productRepository;
        this.platformListingRepository = platformListingRepository;
        this.productAnalysisRepository = productAnalysisRepository;
        this.properties = properties;
        this.notificationService = notificationService;
    }

    /**
     * 상품의 가장 최근 시세 분석 스냅샷을 조회한다. 분석 이력이 없으면(배치가 아직 안 돌았거나 비교
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
                .map(analysis -> ProductAnalysisResponse.from(product, analysis))
                .orElseGet(() -> ProductAnalysisResponse.empty(product));
    }

    /**
     * 시세 분석과 같은 기준(같은 카테고리·판매중·최근 수집 매물, 최소 {@code min-listings}건)으로 비교 매물 평균가만
     * 계산한다(AI 호출·저장 없음). 등록 직후나 분석 이력이 없는 상품 상세처럼 시세 분석 스냅샷이 없을 때 사용한다.
     *
     * @param categoryId 상품 카테고리 ID
     * @return 비교 매물이 {@code min-listings}보다 적으면 빈 값
     */
    @Transactional(readOnly = true)
    public Optional<Long> calculateMarketAveragePrice(Long categoryId) {
        LocalDateTime freshAfter = LocalDateTime.now().minusHours(properties.freshnessHours());
        ListingPriceStats stats = platformListingRepository.findPriceStats(categoryId, SELLING_STATUS, freshAfter);
        if (stats == null || stats.averagePrice() == null || stats.count() < properties.minListings()) {
            return Optional.empty();
        }
        return Optional.of(Math.round(stats.averagePrice()));
    }

    /**
     * 분석 대상 상태({@link ProductStatus#ANALYSIS_TARGETS} — 외부 게시 전 등록 상품 포함)의 상품 전체를 순회하며
     * 분석한다(스케줄러 진입점). 한 건이 실패해도 나머지는 계속 진행한다.
     */
    public void analyzeAll() {
        List<Product> products = productRepository.findByStatusIn(ProductStatus.ANALYSIS_TARGETS);
        log.info("시세 분석 대상 상품 {}건", products.size());
        for (Product product : products) {
            analyzeProductSafely(product);
            sleepBetweenAiCalls();
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
        LocalDateTime freshAfter = LocalDateTime.now().minusHours(properties.freshnessHours());
        List<PlatformListing> listings =
                platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        product.getCategory().getId(), SELLING_STATUS, freshAfter);

        if (listings.size() < properties.minListings()) {
            log.info(
                    "상품 {}: 비교 가능한 매물이 {}건뿐이라 분석을 건너뜁니다(최소 {}건 필요).",
                    product.getId(),
                    listings.size(),
                    properties.minListings());
            return;
        }

        LongSummaryStatistics stats =
                listings.stream().mapToLong(PlatformListing::getPrice).summaryStatistics();
        long minPrice = stats.getMin();
        long averagePrice = Math.round(stats.getAverage());
        long maxPrice = stats.getMax();

        Optional<ProductAnalysis> previous =
                productAnalysisRepository.findFirstByProductIdOrderByAnalyzedAtDesc(product.getId());
        BigDecimal changeRate = previous.map(p -> calculateChangeRate(p.getAveragePrice(), averagePrice))
                .orElse(null);

        MarketAnalysisResult aiResult = requestAiAnalysis(product, listings, minPrice, averagePrice, maxPrice);

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

        // 시세 분석이 적정가를 냈으면 상품의 AI 제안가도 최신 값으로 갱신(상세/수정 응답의 suggestedPrice)
        if (aiResult.suggestedPrice() != null) {
            productRepository.updateSuggestedPrice(product.getId(), aiResult.suggestedPrice());
        }

        // 추천이 직전 스냅샷과 달라졌으면 판매자(SELL)/관심 등록 회원(BUY)에게 알림
        notificationService.notifyRecommendationChanged(
                product, previous.map(ProductAnalysis::getRecommendation).orElse(null), aiResult.recommendation());
    }

    private MarketAnalysisResult requestAiAnalysis(
            Product product, List<PlatformListing> listings, long minPrice, long averagePrice, long maxPrice) {
        String sample = listings.stream()
                .limit(properties.sampleSize())
                .map(listing -> "- %s: %d원".formatted(listing.getTitle(), listing.getPrice()))
                .collect(Collectors.joining("\n"));

        String userPrompt = USER_PROMPT_TEMPLATE.formatted(
                product.getTitle(),
                minPrice,
                averagePrice,
                maxPrice,
                product.getPrice(),
                product.getCondition(),
                defectStatusLabel(product.getDefectStatus()),
                Math.min(listings.size(), properties.sampleSize()),
                sample);

        // Gemini가 실패하면 같은 요청을 OpenAI GPT로 대체 호출
        MarketAnalysisResult result = aiChatExecutor.call("시세 분석", client -> client.prompt()
                .system(SYSTEM_PROMPT)
                .user(userPrompt)
                .call()
                .entity(MarketAnalysisResult.class));
        assert result != null;
        return result;
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
