package com.swyp.team5.product.dto;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.error.InvalidProductSearchException;

/**
 * 상품 목록 조회(통합 검색) 조건. 컬렉션 필터는 비어 있으면 미적용이다.
 *
 * @param keyword 제목/설명(외부 매물은 제목만) 포함 키워드
 * @param excludeKeywords 하나라도 제목/설명에 포함되면 제외할 단어(소문자)
 * @param status 우리 상품 상태 필터(지정 시 외부 매물 제외 — 기존 동작 유지)
 * @param tradeStatuses 거래 상태 필터(미지정 시 외부 매물은 판매중만)
 * @param platforms 플랫폼 필터
 * @param minPrice 최소 가격(포함)
 * @param maxPrice 최대 가격(포함)
 * @param conditions 제품 상태 등급 필터(외부 매물은 등급이 없어 지정 시 제외)
 * @param defectStatuses 하자 여부 필터(외부 매물은 정보가 없어 지정 시 제외)
 * @param sort 정렬 기준
 */
public record ProductSearchCondition(
        String keyword,
        List<String> excludeKeywords,
        ProductStatus status,
        Set<ListingTradeStatus> tradeStatuses,
        Set<ProductSearchPlatform> platforms,
        Long minPrice,
        Long maxPrice,
        Set<ProductCondition> conditions,
        Set<DefectStatus> defectStatuses,
        ProductSortType sort) {

    public ProductSearchCondition {
        keyword = keyword == null || keyword.isBlank() ? null : keyword.trim();
        excludeKeywords = excludeKeywords == null ? List.of() : List.copyOf(excludeKeywords);
        tradeStatuses = copy(tradeStatuses, ListingTradeStatus.class);
        platforms = copy(platforms, ProductSearchPlatform.class);
        conditions = copy(conditions, ProductCondition.class);
        defectStatuses = copy(defectStatuses, DefectStatus.class);
        sort = sort == null ? ProductSortType.LATEST : sort;
        if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
            throw new InvalidProductSearchException("최소 가격은 최대 가격보다 클 수 없습니다.");
        }
    }

    /** 키워드만으로 최신순 조회하는 기본 조건. */
    public static ProductSearchCondition ofKeyword(String keyword) {
        return new ProductSearchCondition(
                keyword, null, null, null, null, null, null, null, null, ProductSortType.LATEST);
    }

    /** 공백으로 구분된 제외 키워드 문자열을 소문자 단어 목록으로 나눈다({@code null}·공백이면 빈 목록). */
    public static List<String> splitExcludeKeywords(String excludeKeyword) {
        if (excludeKeyword == null || excludeKeyword.isBlank()) {
            return List.of();
        }
        return Arrays.stream(excludeKeyword.trim().split("[\\s,]+"))
                .filter(word -> !word.isBlank())
                .map(word -> word.toLowerCase(Locale.ROOT))
                .distinct()
                .toList();
    }

    /** 우리 상품을 결과에 포함하는지(플랫폼 필터에 OUR가 있고, 거래 상태 필터에 대응하는 상태가 있을 때). */
    public boolean includesOurProducts() {
        boolean platformMatches = platforms.isEmpty() || platforms.contains(ProductSearchPlatform.OUR);
        return platformMatches && (tradeStatuses.isEmpty() || !ourStatuses().isEmpty());
    }

    /** 외부 매물을 결과에 포함하는지(우리 상품 고유 필터 — 상태·등급·하자 — 가 없고, 외부 플랫폼이 선택됐을 때). */
    public boolean includesExternalListings() {
        boolean platformMatches =
                platforms.isEmpty() || !externalPlatformNames().isEmpty();
        return platformMatches && status == null && conditions.isEmpty() && defectStatuses.isEmpty();
    }

    /** 거래 상태 필터에 대응하는 우리 상품 상태(필터 미지정이면 빈 집합 = 미적용). */
    public Set<ProductStatus> ourStatuses() {
        return tradeStatuses.stream()
                .flatMap(tradeStatus -> tradeStatus.ourStatuses().stream())
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(ProductStatus.class)));
    }

    /** 플랫폼 필터 중 외부 플랫폼의 {@code platforms.name} 값(필터 미지정이면 빈 집합 = 미적용). */
    public Set<String> externalPlatformNames() {
        return platforms.stream()
                .map(ProductSearchPlatform::platformName)
                .filter(name -> name != null)
                .collect(Collectors.toSet());
    }

    private static <E extends Enum<E>> Set<E> copy(Set<E> values, Class<E> type) {
        return values == null || values.isEmpty() ? EnumSet.noneOf(type) : EnumSet.copyOf(values);
    }
}
