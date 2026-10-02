package com.swyp.team5.product.dto;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Base64;

import com.swyp.team5.product.error.InvalidProductSearchException;

/**
 * 상품 목록 조회(통합 검색)의 커서 — 이전 페이지 마지막 항목의 (정렬값, 등록일시, ID). ID는 우리 상품·외부 매물 공통
 * ({@code items.item_id})이라 출처 없이도 유일하다. 정렬값은 최신순이면 {@code null}이다. 응답에는 Base64URL 문자열로 인코딩해
 * 내려가며 호출 측은 그대로 돌려주기만 하면 된다.
 */
public record ProductSearchCursor(Long sortKey, LocalDateTime createdAt, Long id) {

    private static final String DELIMITER = "|";

    public String encode() {
        String raw =
                String.join(DELIMITER, sortKey == null ? "" : sortKey.toString(), createdAt.toString(), id.toString());
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 커서 문자열을 해석한다.
     *
     * @param value 응답의 {@code nextCursor} 값({@code null}·공백이면 첫 페이지)
     * @param sort 요청의 정렬 기준(정렬값이 필요한 정렬인데 커서에 없으면 다른 정렬의 커서로 보고 거부)
     * @return 해석한 커서, 첫 페이지면 {@code null}
     * @throws InvalidProductSearchException 해석할 수 없는 커서인 경우
     */
    public static ProductSearchCursor decode(String value, ProductSortType sort) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            String raw = new String(Base64.getUrlDecoder().decode(value.trim()), StandardCharsets.UTF_8);
            String[] parts = raw.split("\\|", -1);
            if (parts.length != 3) {
                throw invalid();
            }
            Long sortKey = parts[0].isEmpty() ? null : Long.valueOf(parts[0]);
            if ((sortKey == null) != (sort == ProductSortType.LATEST)) {
                throw invalid();
            }
            return new ProductSearchCursor(sortKey, LocalDateTime.parse(parts[1]), Long.valueOf(parts[2]));
        } catch (IllegalArgumentException | DateTimeParseException e) {
            throw invalid();
        }
    }

    private static InvalidProductSearchException invalid() {
        return new InvalidProductSearchException("목록 위치 정보가 올바르지 않아요. 목록을 처음부터 다시 불러와 주세요.");
    }
}
