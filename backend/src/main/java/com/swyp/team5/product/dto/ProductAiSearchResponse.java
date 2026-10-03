package com.swyp.team5.product.dto;

import java.util.Set;

import com.swyp.team5.common.common.CursorPageResponse;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;

/**
 * AI 상품 검색 응답. {@code condition}은 {@code GET /products}의 쿼리 파라미터와 이름·형식이 같아, 다음 페이지는 이
 * 조건과 {@code result.nextCursor}로 {@code GET /products}를 호출하면 된다(AI를 다시 호출하지 않음).
 *
 * @param aiApplied AI가 문장을 해석했는지(실패하면 false — 문장 전체를 키워드로 검색)
 * @param condition 적용한 검색 조건
 * @param result 첫 페이지 검색 결과
 */
public record ProductAiSearchResponse(
        boolean aiApplied, Condition condition, CursorPageResponse<ProductListItemResponse> result) {

    public static ProductAiSearchResponse of(
            boolean aiApplied, ProductSearchCondition condition, CursorPageResponse<ProductListItemResponse> result) {
        return new ProductAiSearchResponse(aiApplied, Condition.from(condition), result);
    }

    /**
     * {@code GET /products}에 그대로 넘길 수 있는 검색 조건.
     *
     * @param keyword 검색어
     * @param excludeKeyword 제외 키워드(공백 구분, 없으면 null)
     * @param status 상품 상태
     * @param platform 플랫폼
     * @param minPrice 최소 가격
     * @param maxPrice 최대 가격
     * @param condition 제품 상태 등급
     * @param defectStatus 하자 여부
     * @param sort 정렬
     */
    public record Condition(
            String keyword,
            String excludeKeyword,
            Set<ProductStatus> status,
            Set<ProductSearchPlatform> platform,
            Long minPrice,
            Long maxPrice,
            Set<ProductCondition> condition,
            Set<DefectStatus> defectStatus,
            ProductSortType sort) {

        static Condition from(ProductSearchCondition condition) {
            return new Condition(
                    condition.keyword(),
                    condition.excludeKeywords().isEmpty() ? null : String.join(" ", condition.excludeKeywords()),
                    condition.statuses(),
                    condition.platforms(),
                    condition.minPrice(),
                    condition.maxPrice(),
                    condition.conditions(),
                    condition.defectStatuses(),
                    condition.sort());
        }
    }
}
