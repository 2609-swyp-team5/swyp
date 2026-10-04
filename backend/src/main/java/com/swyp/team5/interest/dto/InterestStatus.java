package com.swyp.team5.interest.dto;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Stream;

import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;

/**
 * 관심상품 상태(관심상품 목록 탭·필터용). 저장하지 않고 조회할 때 대상의 판매 상태·최근 시세 분석(구매자 관점)으로 정하며,
 * 한 관심상품은 아래 우선순위대로 정확히 하나의 값만 가진다.
 *
 * <ol>
 *   <li>{@link #SOLD_OUT} 판매종료 — 대상 판매 상태가 SOLD_OUT(외부 매물은 변환한 상태 기준)
 *   <li>{@link #BUY} 구매추천 — 최근 분석 추천이 BUY
 *   <li>{@link #WAIT} 관찰중 — 최근 분석 추천이 WAIT(분석 결과는 있지만 구매 추천이 아님), 또는 분석 결과가 없지만 분석이 대기·진행 중
 *   <li>{@link #PENDING} 분석대기 — 분석 결과가 없고 분석 중도 아님(비교 매물 부족으로 분석을 건너뛴 경우, 분석 배치가 꺼진 경우 등)
 * </ol>
 */
public enum InterestStatus {
    BUY,
    WAIT,
    SOLD_OUT,
    PENDING;

    /**
     * @param saleStatus 대상 판매 상태(외부 매물은 {@link ProductStatus#fromExternal}로 변환한 값)
     * @param recommendation 대상의 최근 시세 분석 추천(구매자 관점, 분석 이력 없으면 null)
     * @param analyzing 대상의 시세 분석이 대기 중이거나 진행 중인지
     */
    public static InterestStatus of(
            ProductStatus saleStatus, AnalysisRecommendation recommendation, boolean analyzing) {
        if (saleStatus == ProductStatus.SOLD_OUT) {
            return SOLD_OUT;
        }
        if (recommendation == AnalysisRecommendation.BUY) {
            return BUY;
        }
        if (recommendation == AnalysisRecommendation.WAIT) {
            return WAIT;
        }
        return analyzing ? WAIT : PENDING;
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
