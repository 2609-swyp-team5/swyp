package com.swyp.team5.productanalysis.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 상품의 최근 가격 추이(시세 분석 스냅샷의 일별 집계).
 *
 * @param currentPrice 상품의 현재 등록가(판매 희망가)
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
     */
    public record Point(LocalDate date, Long averagePrice, Long minPrice, Long maxPrice, int analysisCount) {}
}
