package com.swyp.team5.productanalysis.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.LongSummaryStatistics;
import java.util.stream.Collectors;

import lombok.extern.slf4j.Slf4j;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.PlatformListingRepository;
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
 * 추천(SELL/HOLD/BUY/WAIT)/적정가/판단 근거는 AI(Gemini)에게 위임한다.
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

    private final ChatClient geminiAiClient;
    private final ProductRepository productRepository;
    private final PlatformListingRepository platformListingRepository;
    private final ProductAnalysisRepository productAnalysisRepository;
    private final ProductAnalysisProperties properties;

    public ProductAnalysisService(
            @Qualifier("geminiAiClient") ChatClient geminiAiClient,
            ProductRepository productRepository,
            PlatformListingRepository platformListingRepository,
            ProductAnalysisRepository productAnalysisRepository,
            ProductAnalysisProperties properties) {
        this.geminiAiClient = geminiAiClient;
        this.productRepository = productRepository;
        this.platformListingRepository = platformListingRepository;
        this.productAnalysisRepository = productAnalysisRepository;
        this.properties = properties;
    }

    /**
     * 상품의 가장 최근 시세 분석 스냅샷을 조회한다. 분석 이력이 없으면(배치가 아직 안 돌았거나 비교
     * 매물 부족으로 건너뛴 경우) 필드가 전부 null인 응답을 반환한다.
     *
     * @throws ProductNotFoundException 존재하지 않는 상품인 경우
     */
    @Transactional(readOnly = true)
    public ProductAnalysisResponse getLatestAnalysis(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ProductNotFoundException(productId);
        }
        return productAnalysisRepository
                .findFirstByProductIdOrderByAnalyzedAtDesc(productId)
                .map(ProductAnalysisResponse::from)
                .orElseGet(() -> ProductAnalysisResponse.empty(productId));
    }

    /** 판매중인 상품 전체를 순회하며 분석한다(스케줄러 진입점). 한 건이 실패해도 나머지는 계속 진행한다. */
    public void analyzeAll() {
        List<Product> products = productRepository.findByStatus(ProductStatus.ON_SALE);
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

        BigDecimal changeRate = productAnalysisRepository
                .findFirstByProductIdOrderByAnalyzedAtDesc(product.getId())
                .map(previous -> calculateChangeRate(previous.getAveragePrice(), averagePrice))
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
                product.isHasDefect() ? "있음" : "없음",
                Math.min(listings.size(), properties.sampleSize()),
                sample);

        MarketAnalysisResult result = geminiAiClient
                .prompt()
                .system(SYSTEM_PROMPT)
                .user(userPrompt)
                .call()
                .entity(MarketAnalysisResult.class);
        assert result != null;
        return result;
    }

    private static BigDecimal calculateChangeRate(Long previousAveragePrice, long currentAveragePrice) {
        if (previousAveragePrice == null || previousAveragePrice == 0) {
            return null;
        }
        return BigDecimal.valueOf(currentAveragePrice - previousAveragePrice)
                .divide(BigDecimal.valueOf(previousAveragePrice), 4, RoundingMode.HALF_UP);
    }
}
