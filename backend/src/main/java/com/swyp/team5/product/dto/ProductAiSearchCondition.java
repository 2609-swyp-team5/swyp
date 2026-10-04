package com.swyp.team5.product.dto;

import java.util.List;

import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;

/**
 * AI가 자연어 검색 문장에서 뽑아낸 검색 조건(AI 응답 매핑용). 언급되지 않은 조건은 {@code null}·빈 목록이다.
 *
 * @param keyword 상품을 찾을 핵심 검색어(상품명·모델명 위주)
 * @param excludeKeywords 결과에서 뺄 단어
 * @param minPrice 최소 가격(원)
 * @param maxPrice 최대 가격(원)
 * @param statuses 상품 상태
 * @param platforms 플랫폼
 * @param conditions 제품 상태 등급
 * @param defectStatuses 하자 여부
 * @param sort 정렬 기준
 */
public record ProductAiSearchCondition(
        String keyword,
        List<String> excludeKeywords,
        Long minPrice,
        Long maxPrice,
        List<ProductStatus> statuses,
        List<ProductSearchPlatform> platforms,
        List<ProductCondition> conditions,
        List<DefectStatus> defectStatuses,
        ProductSortType sort) {}
