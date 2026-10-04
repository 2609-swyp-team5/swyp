package com.swyp.team5.productanalysis.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

/**
 * 상품(또는 관심 등록된 외부 매물)의 최근 가격 추이(시세 분석 스냅샷의 일별 집계).
 *
 * @param currentPrice 상품의 현재 등록가(판매 희망가, 외부 매물은 판매가)
 * @param priceTrend 가격 추이
 */
public record PriceTrendResponse(Long productId, Long currentPrice, Trend priceTrend) {

    /** 직전 기록일(분석이 있었던 날) 대비로 변화를 계산한다. */
    public static final String COMPARISON_BASIS = "PREVIOUS_TRADING_DAY";

    /**
     * @param period 조회 기간 코드 — 30일이면 {@code 1M}, 그 밖에는 {@code {days}D}(예: {@code 7D})
     * @param comparisonBasis 일별 변화의 비교 기준({@link #COMPARISON_BASIS})
     * @param totalTransactionCount 기간 내 일별 비교 매물 수의 합(실거래 데이터가 없어 판매 중 비교 매물 수로 대신함)
     * @param days 조회 기간(일, 오늘 포함)
     * @param from 조회 시작일(포함)
     * @param to 조회 종료일(오늘, 포함)
     * @param averagePrice 기간 평균가(일별 평균가의 평균), 기록이 없으면 null
     * @param changeRate 첫 기록일 대비 마지막 기록일 평균가 변동률(소수 4자리, 예: -0.0350 = 3.5% 하락), 기록일이 2일 미만이면 null
     * @param points 기록이 있는 날만 날짜 오름차순(분석이 안 된 날은 빠짐)
     */
    public record Trend(
            String period,
            String comparisonBasis,
            long totalTransactionCount,
            int days,
            LocalDate from,
            LocalDate to,
            Long averagePrice,
            BigDecimal changeRate,
            List<Point> points) {

        public static Trend of(
                int days, LocalDate from, LocalDate to, Long averagePrice, BigDecimal changeRate, List<Point> points) {
            return new Trend(
                    days == 30 ? "1M" : days + "D",
                    COMPARISON_BASIS,
                    points.stream().mapToLong(Point::transactionCount).sum(),
                    days,
                    from,
                    to,
                    averagePrice,
                    changeRate,
                    points);
        }
    }

    /**
     * 하루치 시세. 같은 날 여러 번 분석됐으면 평균가는 그 평균, 최저/최고가는 그날 중 최저/최고다.
     *
     * @param transactionCount 그날 분석에 쓴 비교 매물 수(여러 번이면 최대, 신뢰도 도입 이전 분석만 있으면 0)
     * @param analysisCount 그날 분석 횟수
     * @param change 직전 기록일 대비 평균가 변화(첫 기록일은 null)
     */
    public record Point(
            LocalDate date,
            Long averagePrice,
            long transactionCount,
            Long minPrice,
            Long maxPrice,
            int analysisCount,
            Change change) {}

    /**
     * 직전 기록일 대비 평균가 변화. 분석이 없는 날은 건너뛰므로 직전 기록일이 바로 전날이 아닐 수 있다.
     *
     * @param comparedDate 비교한 직전 기록일
     * @param amount 평균가 변화 금액(원, 하락이면 음수)
     * @param rate 평균가 변화율(%, 소수 둘째 자리 반올림, 예: -1.21), 직전 평균가가 0이면 0
     */
    public record Change(LocalDate comparedDate, long amount, BigDecimal rate) {

        /** 직전 점이 없으면(첫 기록일) null. */
        public static Change between(Point previous, long averagePrice) {
            if (previous == null) {
                return null;
            }
            long amount = averagePrice - previous.averagePrice();
            BigDecimal rate = previous.averagePrice() == 0
                    ? BigDecimal.ZERO
                    : BigDecimal.valueOf(amount)
                            .multiply(BigDecimal.valueOf(100))
                            .divide(BigDecimal.valueOf(previous.averagePrice()), 2, RoundingMode.HALF_UP);
            return new Change(previous.date(), amount, rate);
        }
    }
}
