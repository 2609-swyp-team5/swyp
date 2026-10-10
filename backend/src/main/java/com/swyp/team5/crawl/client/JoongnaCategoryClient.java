package com.swyp.team5.crawl.client;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.swyp.team5.crawl.dto.JoongnaCategoryPage;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
public class JoongnaCategoryClient {

    private static final String SEARCH_PATH = "/v3/category/search";
    private static final String CATEGORY_PATH = "/category";

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final RestClient joongnaSearchRestClient;
    private final RestClient joongnaProductRestClient;

    public JoongnaCategoryPage fetchPage(String categorySeq, int categoryDepth, int page) {
        Map<String, Object> body = Map.of(
                "page",
                page,
                "sort",
                "RECENT_SORT",
                "saleYn",
                "SALE_N",
                "categoryFilter",
                List.of(Map.of("categoryDepth", categoryDepth, "categorySeq", Long.parseLong(categorySeq))));
        JsonNode root = joongnaSearchRestClient
                .post()
                .uri(SEARCH_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
        return JoongnaCategoryPage.from(root, page, objectMapper);
    }

    public Map<String, Integer> fetchCategoryDepths() {
        JsonNode root = joongnaProductRestClient
                .get()
                .uri(uriBuilder ->
                        uriBuilder.path(CATEGORY_PATH).queryParam("type", "ALL").build())
                .retrieve()
                .body(JsonNode.class);
        Map<String, Integer> depths = new HashMap<>();
        for (JsonNode category : root.path("data").path("categoryList")) {
            depths.put(
                    category.path("categorySeq").asString(),
                    category.path("categoryLevel").asInt());
        }
        return depths;
    }
}
