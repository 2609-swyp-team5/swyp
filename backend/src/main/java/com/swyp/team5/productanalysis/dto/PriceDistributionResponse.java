package com.swyp.team5.productanalysis.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * 상품(또는 외부 매물)과 비슷한 물건의 판매 완료 가격 분포. 조회 시점에 같은 카테고리에서 최근 {@code days}일 안에 판매 완료가 확인된
 * 외부 매물 중 제목이 비슷한 것을 골라, 그 가격을 최저~최고가 사이 같은 폭의 구간으로 센다. 가격은 판매 완료 직전의 등록가다(번개장터는
 * 실제 거래 금액을 공개하지 않음).
 *
 * @param days 조회 기간(일, 오늘 포함)
 * @param from 조회 시작일(판매 완료 확인일 기준)
 * @param to 조회 종료일(오늘)
 * @param soldCount 분포에 쓴 판매 완료 매물 수(이상치 제외 후), 없으면 0
 * @param minPrice 판매 완료 최저가(첫 구간 시작), 매물이 없으면 null
 * @param averagePrice 판매 완료 평균가, 매물이 없으면 null
 * @param maxPrice 판매 완료 최고가(마지막 구간 끝), 매물이 없으면 null
 * @param buckets 가격 구간(낮은 가격 순, 마지막 구간만 {@code to} 포함), 매물이 없으면 빈 배열
 */
public record PriceDistributionResponse(
        Long productId,
        int days,
        LocalDate from,
        LocalDate to,
        int soldCount,
        Long minPrice,
        Long averagePrice,
        Long maxPrice,
        List<ProductAnalysisResponse.PriceBucket> buckets) {

    /**
     * @param prices 분포에 쓸 판매 완료 가격(이상치 제외 후)
     * @param bucketCount 최대 구간 수
     */
    public static PriceDistributionResponse of(
            Long productId, int days, LocalDate from, LocalDate to, List<Long> prices, int bucketCount) {
        if (prices.isEmpty()) {
            return new PriceDistributionResponse(productId, days, from, to, 0, null, null, null, List.of());
        }
        long min = prices.stream().mapToLong(Long::longValue).min().orElseThrow();
        long max = prices.stream().mapToLong(Long::longValue).max().orElseThrow();
        long average =
                Math.round(prices.stream().mapToLong(Long::longValue).average().orElseThrow());
        return new PriceDistributionResponse(
                productId,
                days,
                from,
                to,
                prices.size(),
                min,
                average,
                max,
                ProductAnalysisResponse.PriceBucket.distribute(prices, min, max, bucketCount));
    }
}
