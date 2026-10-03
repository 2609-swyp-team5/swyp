package com.swyp.team5.product.entity;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/** 상품 판매 상태 */
public enum ProductStatus {
    /** 등록됨(외부 플랫폼 미게시) — 등록 직후 기본값 */
    DRAFT,
    /** 판매중(외부 플랫폼에 게시됨) */
    ON_SALE,
    /** 예약중 */
    RESERVED,
    /** 판매 완료 */
    SOLD_OUT;

    /** 시세 분석·시세 수집 대상 상태(외부 게시 전 상품도 시세를 보여주기 위해 {@link #DRAFT} 포함). */
    public static final List<ProductStatus> ANALYSIS_TARGETS = List.of(DRAFT, ON_SALE, RESERVED);

    /**
     * 외부 매물의 원본 상태 문자열을 같은 상태 체계로 바꾼다(SELLING → ON_SALE, RESERVED → RESERVED, 그 외 — 판매 완료·삭제·재확인
     * 에러 코드 — 는 SOLD_OUT). 외부 매물에는 DRAFT가 없다.
     */
    public static ProductStatus fromExternal(String externalStatus) {
        if ("SELLING".equals(externalStatus)) {
            return ON_SALE;
        }
        return "RESERVED".equals(externalStatus) ? RESERVED : SOLD_OUT;
    }

    /**
     * 이 상태에 대응하는 외부 매물 원본 상태 문자열(검색 필터용 — ON_SALE→SELLING, RESERVED→RESERVED, SOLD_OUT→SOLD_OUT). 외부
     * 매물에는 DRAFT가 없어 {@code null}.
     */
    public String externalValue() {
        return switch (this) {
            case DRAFT -> null;
            case ON_SALE -> "SELLING";
            case RESERVED -> "RESERVED";
            case SOLD_OUT -> "SOLD_OUT";
        };
    }

    /** 상태별 건수를 상태 선언 순서(DRAFT/ON_SALE/RESERVED/SOLD_OUT)로, 없는 상태는 0으로 채운다(목록 응답의 statusCounts). */
    public static Map<String, Long> countByStatus(Stream<ProductStatus> statuses) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (ProductStatus status : values()) {
            counts.put(status.name(), 0L);
        }
        statuses.forEach(status -> counts.merge(status.name(), 1L, Long::sum));
        return counts;
    }
}
