package com.swyp.team5.crawl.dto;

import java.util.ArrayList;
import java.util.List;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * 번개장터 카테고리 목록·키워드 검색 API 응답페이지(두 API의 응답 형식이 같음).
 */
public record BunjangCategoryPage(List<BunjangProductItem> items, String nextCursor, boolean hasNext) {

    private static final String MAIN_GRID_BLOCK_ID = "mainGrid";

    /** {@link com.swyp.team5.crawl.client.BunjangCategoryClient}가 받은 원본 응답 {@link JsonNode}를 이 페이지로 파싱한다. */
    public static BunjangCategoryPage from(JsonNode root, ObjectMapper objectMapper) {
        JsonNode mainGrid = findBlock(root, MAIN_GRID_BLOCK_ID);
        if (mainGrid == null) {
            return new BunjangCategoryPage(List.of(), null, false);
        }

        JsonNode searchResponse = mainGrid.path("searchResponse");
        // 상품이 아닌 항목(키워드 검색의 외부 광고 EXT_AD 등)은 pid·가격이 null이라 변환하면 실패하므로 뺀다
        List<BunjangProductItem> items = new ArrayList<>();
        for (JsonNode node : searchResponse.path("data")) {
            if (isProduct(node)) {
                items.add(objectMapper.convertValue(node, BunjangProductItem.class));
            }
        }
        String nextCursor = textOrNull(searchResponse.path("nextCursor"));
        return new BunjangCategoryPage(items, nextCursor, nextCursor != null);
    }

    private static boolean isProduct(JsonNode node) {
        return node.hasNonNull("pid") && node.hasNonNull("price");
    }

    private static JsonNode findBlock(JsonNode root, String blockId) {
        for (JsonNode block : root.path("data").path("searchSpec").path("uiBlockList")) {
            if (blockId.equals(block.path("id").asString())) {
                return block;
            }
        }
        return null;
    }

    private static String textOrNull(JsonNode node) {
        return (node.isMissingNode() || node.isNull()) ? null : node.asString();
    }
}
