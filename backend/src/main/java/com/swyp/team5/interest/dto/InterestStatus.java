package com.swyp.team5.interest.dto;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Stream;

import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;

/**
 * 관심상품 상태(관심상품 목록 탭·필터용). 저장하지 않고 조회할 때 대상의 판매 상태·최근 시세 분석(구매자 관점)·등록 시각으로 정하며,
 * 한 관심상품은 아래 우선순위대로 정확히 하나의 값만 가진다.
 *
 * <ol>
 *   <li>{@link #SOLD_OUT} 판매종료 — 대상 판매 상태가 SOLD_OUT(외부 매물은 변환한 상태 기준)
 *   <li>{@link #BUY} 구매추천 — 최근 분석 추천이 BUY
 *   <li>{@link #WATCHING} 관찰중 — 등록 직후(첫 분석 배치 전) 또는 최근 분석 추천이 WAIT
 *   <li>{@link #PENDING} 분석대기 — 등록 후 {@link #FIRST_ANALYSIS_WINDOW}가 지나도 분석 결과가 없음(비교 매물 부족 등)
 * </ol>
 */
public enum InterestStatus {
    BUY,
    WATCHING,
    SOLD_OUT,
    PENDING;

    /** 등록 후 첫 시세 분석 배치(6시간 주기)를 기다리는 기간 — 이 안에는 분석 결과가 없어도 관찰중. */
    static final Duration FIRST_ANALYSIS_WINDOW = Duration.ofHours(6);

    /**
     * @param saleStatus 대상 판매 상태(외부 매물은 {@link ProductStatus#fromExternal}로 변환한 값)
     * @param recommendation 대상의 최근 시세 분석 추천(구매자 관점, 분석 이력 없으면 null)
     * @param registeredAt 관심 등록 일시(null이면 방금 등록한 것으로 봄)
     */
    public static InterestStatus of(
            ProductStatus saleStatus,
            AnalysisRecommendation recommendation,
            LocalDateTime registeredAt,
            LocalDateTime now) {
        if (saleStatus == ProductStatus.SOLD_OUT) {
            return SOLD_OUT;
        }
        if (recommendation == AnalysisRecommendation.BUY) {
            return BUY;
        }
        if (recommendation != null) {
            return WATCHING;
        }
        boolean justRegistered =
                registeredAt == null || registeredAt.plus(FIRST_ANALYSIS_WINDOW).isAfter(now);
        return justRegistered ? WATCHING : PENDING;
    }

    /** 관심상품 상태별 건수 — 모든 상태를 0으로 채운 뒤 센다(목록 응답 {@code statusCounts}용). */
    public static Map<String, Long> countByStatus(Stream<InterestStatus> statuses) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (InterestStatus status : values()) {
            counts.put(status.name(), 0L);
        }
        statuses.forEach(status -> counts.merge(status.name(), 1L, Long::sum));
        return counts;
    }
}
