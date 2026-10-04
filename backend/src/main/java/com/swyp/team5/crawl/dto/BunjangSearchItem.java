package com.swyp.team5.crawl.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import tools.jackson.databind.JsonNode;

/**
 * 번개장터 키워드 검색 API 응답의 상품 항목 중 시세 분석에 필요한 필드만 담는다. 검색 API는 숫자도 문자열로 주고 판매 상태를
 * 숫자 코드로 주므로(카테고리 목록 API와 다름) 여기서 카테고리 목록 API와 같은 값({@code SELLING} 등)으로 바꾼다.
 *
 * @param bunjangCategoryId 번개장터 자체 카테고리 ID
 */
public record BunjangSearchItem(
        long pid, String name, long price, String status, boolean ad, String productImage, String bunjangCategoryId) {

    /** 검색 API 판매 상태 코드 → 카테고리 목록 API 상태 값(상세 API {@code saleStatus}로 대조 확인, 2026-10-04). */
    private static final Map<String, String> STATUS_BY_CODE = Map.of("0", "SELLING", "1", "RESERVED", "3", "SOLD_OUT");

    public boolean isSelling() {
        return "SELLING".equals(status);
    }

    /** 검색 응답 {@code list[]}를 파싱한다. 필수 값(pid·이름·가격·카테고리)이 없거나 숫자가 아닌 항목은 건너뛴다. */
    public static List<BunjangSearchItem> listFrom(JsonNode root) {
        List<BunjangSearchItem> items = new ArrayList<>();
        for (JsonNode node : root.path("list")) {
            Long pid = longOrNull(node.path("pid"));
            Long price = longOrNull(node.path("price"));
            String name = textOrNull(node.path("name"));
            String categoryId = textOrNull(node.path("category_id"));
            if (pid == null || price == null || name == null || categoryId == null) {
                continue;
            }
            String statusCode = textOrNull(node.path("status"));
            items.add(new BunjangSearchItem(
                    pid,
                    name,
                    price,
                    statusCode == null ? null : STATUS_BY_CODE.getOrDefault(statusCode, statusCode),
                    node.path("ad").asBoolean(false),
                    textOrNull(node.path("product_image")),
                    categoryId));
        }
        return items;
    }

    private static Long longOrNull(JsonNode node) {
        String text = textOrNull(node);
        if (text == null) {
            return null;
        }
        try {
            return Long.parseLong(text);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String textOrNull(JsonNode node) {
        return (node.isMissingNode() || node.isNull() || node.asString().isBlank()) ? null : node.asString();
    }
}
