package com.swyp.team5.productanalysis.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.swyp.team5.productanalysis.entity.ComparisonBasis;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;

/**
 * 상품(또는 외부 매물)의 거래 가격 분포 — 판매 중(가장 최근 시세 분석의 비교 매물)과 판매 완료(조회 시점 계산) 두 가지를 함께 담는다.
 * 화면의 "판매 중 / 판매 완료" 탭 전환은 다시 조회하지 않고 이 응답에서 고른다. 두 탭 모두 가격 필드를 분석 조회와 같은 이름
 * ({@code minPrice}·{@code averagePrice}·{@code suggestedPrice}·{@code maxPrice})으로 담는다.
 *
 * @param onSale 판매 중 비교 매물 가격 분포
 * @param soldOut 판매 완료 가격 분포
 */
public record PriceDistributionResponse(Long productId, OnSale onSale, SoldOut soldOut) {

    /**
     * 판매 중 비교 매물 가격 분포. 가장 최근 시세 분석 때 통계에 쓴 비교 매물 가격을 같은 폭 구간으로 센다(분석 조회의
     * {@code priceDistribution}과 같음). 분석 이력이 없으면 {@code count} 0, 가격·분석 정보는 null, {@code buckets}는 빈 배열이다.
     *
     * @param count 통계에 쓴 비교 매물 수(신뢰도 도입 이전 분석이면 구간에 든 매물 수의 합)
     * @param suggestedPrice 예상 가격 — 시세 기반 추천 가격(저장값이 없으면 평균가, 분석 조회의 {@code suggestedPrice}와 같음)
     * @param comparisonBasis 비교 기준(SAME 같은 물건 / RELATED 비슷한 물건), 분석 이력이 없으면 null
     * @param analyzedAt 분석 시각
     * @param buckets 가격 구간(낮은 가격 순, 마지막 구간만 {@code to} 포함)
     */
    public record OnSale(
            int count,
            Long minPrice,
            Long averagePrice,
            Long suggestedPrice,
            Long maxPrice,
            ComparisonBasis comparisonBasis,
            LocalDateTime analyzedAt,
            List<ProductAnalysisResponse.PriceBucket> buckets) {

        public static OnSale empty() {
            return new OnSale(0, null, null, null, null, null, null, List.of());
        }

        public static OnSale of(ProductAnalysis analysis, List<ProductAnalysisResponse.PriceBucket> buckets) {
            int count = analysis.getListingCount() != null
                    ? analysis.getListingCount()
                    : buckets.stream()
                            .mapToInt(ProductAnalysisResponse.PriceBucket::count)
                            .sum();
            return new OnSale(
                    count,
                    analysis.getMinPrice(),
                    analysis.getAveragePrice(),
                    suggestedPriceOf(analysis),
                    analysis.getMaxPrice(),
                    analysis.getComparisonBasis() == null ? ComparisonBasis.SAME : analysis.getComparisonBasis(),
                    analysis.getAnalyzedAt(),
                    buckets);
        }
    }

    /** 분석의 시세 기반 추천 가격(저장값이 없으면 평균가) — 분석 조회의 {@code suggestedPrice}와 같은 규칙. */
    public static Long suggestedPriceOf(ProductAnalysis analysis) {
        return analysis.getSuggestedPrice() == null ? analysis.getAveragePrice() : analysis.getSuggestedPrice();
    }

    /**
     * 판매 완료 가격 분포. 조회 시점에 같은 카테고리에서 최근 {@code days}일 안에 판매 완료가 확인된 외부 매물 중 제목이 비슷한 것을 골라,
     * 그 가격을 최저~최고가 사이 같은 폭의 구간으로 센다. 가격은 판매 완료 직전의 등록가다(번개장터는 실제 거래 금액을 공개하지 않음).
     *
     * @param days 조회 기간(일, 오늘 포함)
     * @param from 조회 시작일(판매 완료 확인일 기준)
     * @param to 조회 종료일(오늘)
     * @param count 분포에 쓴 판매 완료 매물 수(이상치 제외 후), 없으면 0
     * @param minPrice 판매 완료 최저가(첫 구간 시작), 매물이 없으면 null
     * @param averagePrice 판매 완료 평균가, 매물이 없으면 null
     * @param suggestedPrice 예상 가격 — 판매 중 탭과 같은 값(우리 시세 분석의 추천 가격, 판매 완료 매물과 무관), 분석 이력이 없으면 null
     * @param maxPrice 판매 완료 최고가(마지막 구간 끝), 매물이 없으면 null
     * @param buckets 가격 구간(낮은 가격 순, 마지막 구간만 {@code to} 포함), 매물이 없으면 빈 배열
     */
    public record SoldOut(
            int days,
            LocalDate from,
            LocalDate to,
            int count,
            Long minPrice,
            Long averagePrice,
            Long suggestedPrice,
            Long maxPrice,
            List<ProductAnalysisResponse.PriceBucket> buckets) {

        /**
         * @param prices 분포에 쓸 판매 완료 가격(이상치 제외 후)
         * @param suggestedPrice 예상 가격(분석 이력이 없으면 null)
         * @param bucketCount 최대 구간 수
         */
        public static SoldOut of(
                int days, LocalDate from, LocalDate to, List<Long> prices, Long suggestedPrice, int bucketCount) {
            if (prices.isEmpty()) {
                return new SoldOut(days, from, to, 0, null, null, suggestedPrice, null, List.of());
            }
            long min = prices.stream().mapToLong(Long::longValue).min().orElseThrow();
            long max = prices.stream().mapToLong(Long::longValue).max().orElseThrow();
            long average = Math.round(
                    prices.stream().mapToLong(Long::longValue).average().orElseThrow());
            return new SoldOut(
                    days,
                    from,
                    to,
                    prices.size(),
                    min,
                    average,
                    suggestedPrice,
                    max,
                    ProductAnalysisResponse.PriceBucket.distribute(prices, min, max, bucketCount));
        }
    }
}
