package com.swyp.team5.crawl.client;

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

    private static final String PATH = "/v3/category/search";

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final RestClient joongnaSearchRestClient;

    public JoongnaCategoryPage fetchPage(String joongnaCategoryId, int categoryDepth, int page) {
        JsonNode root = joongnaSearchRestClient
                .post()
                .uri(PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .body(buildBody(joongnaCategoryId, categoryDepth, page))
                .retrieve()
                .body(JsonNode.class);
        return JoongnaCategoryPage.from(root, page, objectMapper);
    }

    private static Map<String, Object> buildBody(String joongnaCategoryId, int categoryDepth, int page) {
        Map<String, Object> categoryFilter =
                Map.of("categoryDepth", categoryDepth, "categorySeq", Long.parseLong(joongnaCategoryId));
        return Map.ofEntries(
                Map.entry("page", page),
                Map.entry("sort", "RECENT_SORT"),
                Map.entry("saleYn", "SALE_N"),
                Map.entry("categoryFilter", List.of(categoryFilter)));
    }
}
