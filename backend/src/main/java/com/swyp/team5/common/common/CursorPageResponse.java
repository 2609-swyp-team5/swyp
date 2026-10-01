package com.swyp.team5.common.common;

import java.util.List;
import java.util.function.Function;

/**
 * 커서 기반 페이지 응답. {@code nextCursor}는 모든 목록에서 문자열이다 — ID 기준 목록은 마지막 항목 ID를 그대로 문자열로,
 * 검색처럼 정렬값이 여러 개인 목록은 인코딩한 값을 담는다. 호출 측은 해석하지 않고 다음 요청의 {@code cursor}로 돌려주기만 한다.
 */
public record CursorPageResponse<T>(List<T> content, String nextCursor, boolean hasNext) {

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
        return new CursorPageResponse<>(content, nextCursor, hasNext);
    }
}
