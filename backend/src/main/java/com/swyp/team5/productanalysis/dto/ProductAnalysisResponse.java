package com.swyp.team5.productanalysis.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.IntStream;

import com.swyp.team5.item.entity.Item;
import com.swyp.team5.productanalysis.entity.AnalysisConfidence;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.PriceForecast;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;

public record ProductAnalysisResponse(
        Long productId,
        Long currentPrice, // 상품의 현재 등록가(판매 희망가, 외부 매물은 판매가) — 분석 이력이 없어도 채워짐
        Long analysisId, // 분석 이력이 없으면 null(아래 필드도 전부 null)
        Long minPrice,
        Long averagePrice,
        Long maxPrice,
        BigDecimal marketPriceDiffRate, // 등록가가 평균가보다 몇 % 높은지(음수면 저렴, 소수 첫째 자리 반올림, 평균가가 0이면 0)
        BigDecimal changeRate, // 직전 분석 대비 평균가 변동률, 직전 분석이 없으면 null
        AnalysisRecommendation
                recommendation, // 요청 관점의 추천 — 판매자(기본) SELL/HOLD, 구매자(perspective=BUY) BUY/WAIT(우리 상품의 구매자 관점 도입 이전 분석이면
        // null). 외부 매물은 항상 BUY/WAIT
        Long suggestedPrice, // 시세 기반 추천 가격(저장값이 없으면 평균가)
        String description, // recommendation의 근거(없으면 빈 문자열)
        AnalysisRecommendation buyerRecommendation, // 우리 상품을 관심 등록한 구매자 관점(BUY/WAIT), 외부 매물·관점 분리 이전 분석은 null
        String buyerDescription, // buyerRecommendation의 근거
        LocalDateTime analyzedAt,
        AnalysisConfidence confidence, // 신뢰도 등급(HIGH/MEDIUM/LOW) — 매물 수 비율·가격 변동 중 낮은 쪽, 분석 24시간 경과 시 한 단계 하향
        Integer confidenceRate, // 신뢰도 비율(0~100, 매물 수 기반 — 비교 매물 20건 이상이면 100)
        Integer listingCount, // 통계에 쓴 비교 매물 수(위 세 필드는 신뢰도 도입 이전 분석이면 null)
        String waitPeriod, // 시세가 오르는 중(우리 상품은 판매자 추천 HOLD)일 때 권장 대기 기간(1M), 그 밖에는 null
        Long expectedPrice, // 1개월 뒤 예상 가격(오르는 중=시세 추세 기반 상승, 그 밖=감가 예측 1M), 도입 이전 분석은 null
        BigDecimal expectedPriceChangeRate, // 1개월 예상 변화율(소수 4자리 비율, 0.04 = +4%), 도입 이전 분석은 null
        List<PriceForecastResponse>
                forecasts, // 감가 예측가(1M/3M/6M 순), 분석 이력이 없거나 예측 도입 전 분석이면 빈 배열 — GET /analysis/forecast로 분리됨, 프론트 전환 후
        // 제거 예정
        Long marketExpectedPrice, // 예상 시세 — 1개월 뒤 예상 가격(expectedPrice), 도입 이전 분석이면 평균가
        List<PriceBucket> priceDistribution, // 비교 매물 가격 분포(최저~최고가를 같은 폭으로 나눈 구간, 낮은 가격 순), 매물이 없으면 빈 배열
        Summary summary) { // 요약 지표 — 추천이 SELL이면 판매 현황(SALE_STATS), 그 밖에는 대기 추천 지표(WAIT_RECOMMENDATION)

    /**
     * 가격 분포 한 구간. 마지막 구간만 {@code to}를 포함하고 나머지는 {@code to} 미만이다.
     *
     * @param count 구간에 든 비교 매물 수
     */
    public record PriceBucket(long from, long to, int count) {

        /**
         * 가격 목록을 최저~최고가 사이에서 같은 폭의 구간({@code bucketCount}개 이하)으로 나눈다. 범위를 벗어난 가격은 뺀다.
         * 최저가와 최고가가 같으면 구간 1개다.
         */
        public static List<PriceBucket> distribute(List<Long> prices, long minPrice, long maxPrice, int bucketCount) {
            List<Long> inRange = prices.stream()
                    .filter(price -> price >= minPrice && price <= maxPrice)
                    .toList();
            if (inRange.isEmpty()) {
                return List.of();
            }
            long range = maxPrice - minPrice;
            if (range == 0) {
                return List.of(new PriceBucket(minPrice, maxPrice, inRange.size()));
            }
            long width = Math.ceilDiv(range, bucketCount);
            int buckets = (int) Math.min(bucketCount, Math.ceilDiv(range, width));
            int[] counts = new int[buckets];
            inRange.forEach(price -> counts[(int) Math.min((price - minPrice) / width, buckets - 1)]++);
            return IntStream.range(0, buckets)
                    .mapToObj(i -> new PriceBucket(
                            minPrice + i * width, i == buckets - 1 ? maxPrice : minPrice + (i + 1) * width, counts[i]))
                    .toList();
        }
    }

    /** 분석 요약 지표. {@code type}으로 구분한다. */
    public sealed interface Summary permits SaleStats, WaitRecommendation {
        String type();
    }

    /**
     * 판매 추천(SELL)일 때의 판매 현황.
     *
     * @param salesDurationDays 등록일(외부 매물은 최초 수집일)부터 오늘까지 일수(당일이 1)
     * @param viewCount 조회수(외부 매물은 0)
     * @param interestCount 관심 등록한 회원 수
     */
    public record SaleStats(String type, long salesDurationDays, long viewCount, long interestCount)
            implements Summary {

        public static SaleStats of(long salesDurationDays, long viewCount, long interestCount) {
            return new SaleStats("SALE_STATS", salesDurationDays, viewCount, interestCount);
        }
    }

    /**
     * 판매 추천이 아닐 때(HOLD/BUY/WAIT)의 대기 추천 지표.
     *
     * @param waitPeriodDays 권장 대기 기간(일) — 기다리라는 추천(HOLD/WAIT)이면 권장 대기 기간(없으면 예상 가격 기준인 1개월),
     *     지금 사라는 추천(BUY)이면 0
     * @param expectedPriceChangeRate 1개월 예상 가격 변화율(%, 소수 첫째 자리), 도입 이전 분석이면 0
     * @param confidenceScore 신뢰도 비율(0~100), 도입 이전 분석이면 0
     */
    public record WaitRecommendation(
            String type, int waitPeriodDays, BigDecimal expectedPriceChangeRate, int confidenceScore)
            implements Summary {

        public static WaitRecommendation of(
                int waitPeriodDays, BigDecimal expectedPriceChangeRate, int confidenceScore) {
            return new WaitRecommendation(
                    "WAIT_RECOMMENDATION", waitPeriodDays, expectedPriceChangeRate, confidenceScore);
        }
    }

    /** 아직 분석 이력이 없는 상품(분석 배치가 아직 돌지 않았거나, 비교 매물이 부족해 건너뛴 경우)에 사용한다. */
    public static ProductAnalysisResponse empty(Item product) {
        return new ProductAnalysisResponse(
                product.getId(),
                product.getPrice(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                List.of(),
                null,
                List.of(),
                null);
    }

    /**
     * 요청 관점의 추천을 고른다. 구매자 관점이면 구매자에게 보여 줄 추천({@link ProductAnalysis#getBuyerViewRecommendation} — 외부
     * 매물은 저장된 추천, 우리 상품은 구매자 추천이고 구매자 관점 도입 이전 분석이면 null), 판매자 관점이면 저장된 추천이다. 구매자
     * 관점에서 판매자 추천(SELL/HOLD)으로 대체하지 않는다.
     *
     * @param buyerView 구매자 관점 요청 여부
     */
    public static AnalysisRecommendation viewRecommendation(ProductAnalysis analysis, boolean buyerView) {
        return buyerView ? analysis.getBuyerViewRecommendation() : analysis.getRecommendation();
    }

    /**
     * @param buyerView 구매자 관점 요청 여부({@link #viewRecommendation})
     * @param confidence 조회 시점 신뢰도 등급(오래된 분석이면 저장값보다 한 단계 낮음)
     * @param confidenceRate 매물 수 기반 신뢰도 비율
     * @param priceDistribution 비교 매물 가격 분포
     * @param summary 요약 지표
     */
    public static ProductAnalysisResponse from(
            Item product,
            ProductAnalysis analysis,
            boolean buyerView,
            AnalysisConfidence confidence,
            Integer confidenceRate,
            List<PriceForecast> forecasts,
            List<PriceBucket> priceDistribution,
            Summary summary) {
        String description =
                buyerView && analysis.getProduct() != null ? analysis.getBuyerDescription() : analysis.getDescription();
        return new ProductAnalysisResponse(
                product.getId(),
                product.getPrice(),
                analysis.getId(),
                analysis.getMinPrice(),
                analysis.getAveragePrice(),
                analysis.getMaxPrice(),
                diffRate(product.getPrice(), analysis.getAveragePrice()),
                analysis.getChangeRate(),
                viewRecommendation(analysis, buyerView),
                analysis.getSuggestedPrice() == null ? analysis.getAveragePrice() : analysis.getSuggestedPrice(),
                description == null ? "" : description,
                analysis.getBuyerRecommendation(),
                analysis.getBuyerDescription(),
                analysis.getAnalyzedAt(),
                confidence,
                confidenceRate,
                analysis.getListingCount(),
                analysis.getWaitPeriod() == null
                        ? null
                        : analysis.getWaitPeriod().getCode(),
                analysis.getExpectedPrice(),
                analysis.getExpectedPriceChangeRate(),
                PriceForecastResponse.sorted(forecasts),
                analysis.getExpectedPrice() == null ? analysis.getAveragePrice() : analysis.getExpectedPrice(),
                priceDistribution,
                summary);
    }

    /** (등록가 − 평균가) / 평균가 × 100을 소수 첫째 자리로 반올림한다. 평균가가 0이면 0. */
    private static BigDecimal diffRate(Long price, Long averagePrice) {
        if (price == null || averagePrice == null || averagePrice == 0) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(price - averagePrice)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(averagePrice), 1, RoundingMode.HALF_UP);
    }
}
