package com.swyp.team5.crawl.dto;

import java.util.List;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

public record JoongnaCategoryPage(List<JoongnaProductItem> items, boolean hasNext) {

    public static JoongnaCategoryPage from(JsonNode root, int page, ObjectMapper objectMapper) {
        JsonNode data = root.path("data");
        List<JoongnaProductItem> items = objectMapper.convertValue(data.path("items"), new TypeReference<>() {});
        if (items == null || items.isEmpty()) {
            return new JoongnaCategoryPage(List.of(), false);
        }
        long fetched = (long) (page + 1) * data.path("size").asLong(items.size());
        return new JoongnaCategoryPage(items, fetched < data.path("totalSize").asLong(0));
    }
}
