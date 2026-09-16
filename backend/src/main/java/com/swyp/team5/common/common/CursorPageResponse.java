package com.swyp.team5.common.common;

import java.util.List;
import java.util.function.Function;

public record CursorPageResponse<T>(List<T> content, Long nextCursor, boolean hasNext) {

    public static <T> CursorPageResponse<T> of(List<T> items, int size, Function<T, Long> cursorExtractor) {
        boolean hasNext = items.size() > size;
        List<T> content = hasNext ? items.subList(0, size) : items;
        Long nextCursor = hasNext ? cursorExtractor.apply(content.get(content.size() - 1)) : null;
        return new CursorPageResponse<>(content, nextCursor, hasNext);
    }
}
