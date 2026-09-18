package com.swyp.team5.crawl.client;

import java.net.URI;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriBuilder;

import com.swyp.team5.crawl.dto.BunjangCategoryPage;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * 번개장터 카테고리별 상품 목록 조회 클라이언트. HTTP 호출만 담당하고, 응답 파싱은
 * {@link BunjangCategoryPage#from}에 위임한다(정식 공개 API가 아니라 응답 스키마가 예고 없이
 * 바뀔 수 있어 그쪽에서 필요한 필드만 최소한으로 파싱한다). 엔드포인트 상세는
 * docs/시세수집-번개장터-API-참고.md 참고.
 */
@Component
@RequiredArgsConstructor
public class BunjangCategoryClient {

    private static final String PATH = "/api/search/v8/pw/product/specs/category";

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
        return BunjangCategoryPage.from(root, objectMapper);
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
}
