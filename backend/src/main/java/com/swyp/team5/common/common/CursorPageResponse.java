package com.swyp.team5.common.common;

import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * 커서 기반 페이지 응답. {@code nextCursor}는 모든 목록에서 문자열이다 — ID 기준 목록은 마지막 항목 ID를 그대로 문자열로,
 * 검색처럼 정렬값이 여러 개인 목록은 인코딩한 값을 담는다. 호출 측은 해석하지 않고 다음 요청의 {@code cursor}로 돌려주기만 한다.
 *
 * <p>{@code totalCount}는 조건에 맞는 전체 건수, {@code statusCounts}는 같은 조건의 상품 상태별 건수(DRAFT/ON_SALE/RESERVED/SOLD_OUT,
 * 없는 상태는 0)다. 검색·알림은 {@code totalCount}를 첫 페이지({@code cursor} 없이 호출)에서만 채우고(스크롤마다 COUNT 쿼리를 돌리지
 * 않도록), 회원 본인 목록인 내 상품·관심상품은 두 값 모두 매 페이지 채운다. 제공하지 않는 목록·페이지는 {@code null}.
 */
public record CursorPageResponse<T>(
        List<T> content, String nextCursor, boolean hasNext, Long totalCount, Map<String, Long> statusCounts) {

    /**
     * 페이지 크기보다 1건 더 조회한 결과로 응답을 만든다(초과분이 있으면 다음 페이지 존재).
     *
     * @param items 페이지 크기 + 1건까지 조회한 결과
     * @param size 페이지 크기
     * @param cursorExtractor 마지막 항목에서 다음 커서 값을 뽑는 함수(문자열로 변환해 내려감)
     */
    public static <T> CursorPageResponse<T> of(List<T> items, int size, Function<T, ?> cursorExtractor) {
        boolean hasNext = items.size() > size;
        List<T> content = hasNext ? items.subList(0, size) : items;
        String nextCursor = hasNext ? String.valueOf(cursorExtractor.apply(content.get(content.size() - 1))) : null;
        return new CursorPageResponse<>(content, nextCursor, hasNext, null, null);
    }

    /** 전체 건수를 채운 복사본(첫 페이지에서만 호출). */
    public CursorPageResponse<T> withTotalCount(long totalCount) {
        return new CursorPageResponse<>(content, nextCursor, hasNext, totalCount, statusCounts);
    }

    /** 상태별 건수를 채운 복사본(첫 페이지에서만 호출). */
    public CursorPageResponse<T> withStatusCounts(Map<String, Long> statusCounts) {
        return new CursorPageResponse<>(content, nextCursor, hasNext, totalCount, statusCounts);
    }
}
