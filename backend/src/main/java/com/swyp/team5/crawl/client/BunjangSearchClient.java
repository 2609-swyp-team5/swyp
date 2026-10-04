package com.swyp.team5.crawl.client;

import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.swyp.team5.crawl.dto.BunjangSearchItem;
import tools.jackson.databind.JsonNode;

/**
 * 번개장터 키워드 검색({@code GET /api/1/find_v2.json}, 인증 불필요). 카테고리 수집만으로 같은 물건 비교 매물이 부족할 때 상품명으로
 * 비교 매물을 더 찾는 용도로 쓴다. HTTP 호출만 담당하고 파싱은 {@link BunjangSearchItem#listFrom}에 위임한다.
 */
@Component
@RequiredArgsConstructor
public class BunjangSearchClient {

    private static final String PATH = "/api/1/find_v2.json";

    private final RestClient bunjangRestClient;

    /**
     * 검색어로 첫 페이지를 관련도 순으로 조회한다(광고·판매 완료 매물도 섞여 있음).
     *
     * @param size 가져올 건수
     */
    public List<BunjangSearchItem> search(String query, int size) {
        JsonNode root = bunjangRestClient
                .get()
                .uri(uriBuilder -> uriBuilder
                        .path(PATH)
                        .queryParam("q", query)
                        .queryParam("order", "score")
                        .queryParam("page", 0)
                        .queryParam("n", size)
                        .build())
                .retrieve()
                .body(JsonNode.class);
        return root == null ? List.of() : BunjangSearchItem.listFrom(root);
    }
}
