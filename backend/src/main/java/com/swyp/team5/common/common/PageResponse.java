package com.swyp.team5.common.common;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;

/**
 * 페이지 번호 기반 목록 응답. 관리자 화면처럼 전체 건수와 페이지 수가 필요한 목록에 쓴다.
 *
 * <p>무한 스크롤 목록은 전체 건수를 세지 않는 {@link CursorPageResponse}를 쓴다.
 */
public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages, boolean last) {

    /** {@link Page}의 엔티티를 응답 DTO로 변환해 감싼다. */
    public static <E, T> PageResponse<T> of(Page<E> page, Function<E, T> mapper) {
        return new PageResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isLast());
    }
}
