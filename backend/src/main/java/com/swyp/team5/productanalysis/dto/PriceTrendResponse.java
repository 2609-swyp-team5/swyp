package com.swyp.team5.productanalysis.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

/**
 * 상품(또는 관심 등록된 외부 매물)의 최근 가격 추이(시세 분석 스냅샷의 일별 집계).
 *
 * @param currentPrice 상품의 현재 등록가(판매 희망가, 외부 매물은 판매가)
 * @param days 조회 기간(일, 오늘 포함)
 * @param from 조회 시작일(포함)
 * @param to 조회 종료일(오늘, 포함)
 * @param averagePrice 기간 평균가(일별 평균가의 평균), 기록이 없으면 null
 * @param changeRate 첫 기록일 대비 마지막 기록일 평균가 변동률(소수 4자리, 예: -0.0350 = 3.5% 하락), 기록일이 2일 미만이면 null
 * @param points 기록이 있는 날만 날짜 오름차순(분석이 안 된 날은 빠짐)
 */
public record PriceTrendResponse(
        Long productId,
        Long currentPrice,
        int days,
        LocalDate from,
        LocalDate to,
        Long averagePrice,
        BigDecimal changeRate,
        List<Point> points) {

    /**
     * 하루치 시세. 같은 날 여러 번 분석됐으면 평균가는 그 평균, 최저/최고가는 그날 중 최저/최고다.
     *
     * @param analysisCount 그날 분석 횟수
     * @param change 직전 기록일 대비 평균가 변화(첫 기록일은 null)
     */
    public record Point(
            LocalDate date, Long averagePrice, Long minPrice, Long maxPrice, int analysisCount, Change change) {}

    /**
     * 직전 기록일 대비 평균가 변화. 분석이 없는 날은 건너뛰므로 직전 기록일이 바로 전날이 아닐 수 있다.
     *
     * @param comparedDate 비교한 직전 기록일
     * @param amount 평균가 변화 금액(원, 하락이면 음수)
     * @param rate 평균가 변화율(%, 소수 둘째 자리 반올림, 예: -1.21), 직전 평균가가 0이면 null
     */
    public record Change(LocalDate comparedDate, long amount, BigDecimal rate) {

        /** 직전 점이 없으면(첫 기록일) null. */
        public static Change between(Point previous, long averagePrice) {
            if (previous == null) {
                return null;
            }
            long amount = averagePrice - previous.averagePrice();
            BigDecimal rate = previous.averagePrice() == 0
                    ? null
                    : BigDecimal.valueOf(amount)
                            .multiply(BigDecimal.valueOf(100))
                            .divide(BigDecimal.valueOf(previous.averagePrice()), 2, RoundingMode.HALF_UP);
            return new Change(previous.date(), amount, rate);
        }
    }
}
