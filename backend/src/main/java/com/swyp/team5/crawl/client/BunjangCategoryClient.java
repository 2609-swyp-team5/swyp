package com.swyp.team5.crawl.client;

import java.net.URI;
import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriBuilder;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swyp.team5.crawl.client.dto.BunjangCategoryPage;
import com.swyp.team5.crawl.client.dto.BunjangProductItem;

/**
 * 번개장터 카테고리별 상품 목록 조회 클라이언트. 정식 공개 API가 아니라 모바일 웹이 쓰는 내부
 * API를 그대로 호출하므로 응답 스키마가 예고 없이 바뀔 수 있다 — 필요한 필드만 최소한으로
 * 파싱한다. 엔드포인트/응답 구조 상세는 docs/시세수집-번개장터-API-참고.md 참고.
 */
@Component
@RequiredArgsConstructor
public class BunjangCategoryClient {

    private static final String PATH = "/api/search/v8/pw/product/specs/category";
    private static final String MAIN_GRID_BLOCK_ID = "mainGrid";

    // 앱 전역 Jackson 자동 설정에 기대지 않고(스프링 부트 웹 스타터 구성상 ObjectMapper 빈이 항상
    // 있다는 보장이 없어 컨텍스트 로딩이 실패한 적 있음), 이 클라이언트가 직접 소유한다.
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final RestClient bunjangRestClient;

    /**
     * 카테고리 한 페이지(60건 고정으로 보임)를 조회한다.
     *
     * @param bunjangCategoryId 번개장터 자체 카테고리 ID
     * @param cursor 다음 페이지 토큰, 최초 조회 시 {@code null}
     */
    public BunjangCategoryPage fetchPage(String bunjangCategoryId, String cursor) {
        JsonNode root = bunjangRestClient
                .get()
                .uri(uriBuilder -> buildUri(uriBuilder, bunjangCategoryId, cursor))
                .retrieve()
                .body(JsonNode.class);

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

    private static URI buildUri(UriBuilder uriBuilder, String bunjangCategoryId, String cursor) {
        UriBuilder builder = uriBuilder
                .path(PATH)
                .queryParam("categoryId", bunjangCategoryId)
                .queryParam("sort", "latest");
        if (cursor != null) {
            builder = builder.queryParam("cursor", cursor);
        }
        return builder.build();
    }

    private static JsonNode findBlock(JsonNode root, String blockId) {
        for (JsonNode block : root.path("data").path("searchSpec").path("uiBlockList")) {
            if (blockId.equals(block.path("id").asText())) {
                return block;
            }
        }
        return null;
    }

    private static String textOrNull(JsonNode node) {
        return (node.isMissingNode() || node.isNull()) ? null : node.asText();
    }
}
