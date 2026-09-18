package com.swyp.team5.crawl.dto;

import java.util.List;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * 번개장터 카테고리 목록 API 응답 한 페이지. {@code data.searchSpec.uiBlockList[]} 중
 * {@code mainGrid} 블록만 파싱한다(나머지 블록은 시세 수집에 불필요). 정식 공개 API가 아니라
 * 응답 스키마가 예고 없이 바뀔 수 있어 필요한 필드만 최소한으로 파싱한다. 상세 구조는
 * docs/시세수집-번개장터-API-참고.md 참고.
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
        List<BunjangProductItem> items =
                objectMapper.convertValue(searchResponse.path("data"), new TypeReference<>() {});
        String nextCursor = textOrNull(searchResponse.path("nextCursor"));
        return new BunjangCategoryPage(items, nextCursor, nextCursor != null);
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
