package com.swyp.team5.crawl.client;

import java.net.URI;
import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriBuilder;

import com.swyp.team5.crawl.dto.BunjangCategoryPage;
import com.swyp.team5.crawl.dto.BunjangProductItem;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * 번개장터 키워드 검색({@code GET /api/search/v8/pw/product/specs/keyword}, 인증 불필요). 카테고리 수집만으로 같은 물건 비교 매물이
 * 부족할 때 상품명으로 비교 매물을 더 찾는 용도로 쓴다. 응답은 카테고리 목록 API와 같은 형식이라 파싱은
 * {@link BunjangCategoryPage#from}에 위임한다. 이전에 쓰던 {@code /api/1/find_v2.json}은 2026-10-11 확인 시 404로 막혔다.
 */
@Component
@RequiredArgsConstructor
public class BunjangSearchClient {

    private static final String PATH = "/api/search/v8/pw/product/specs/keyword";

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final RestClient bunjangRestClient;

    /**
     * 검색어로 번개장터 카테고리 안을 관련도 순으로 첫 페이지(60건)만 조회한다(광고·판매 완료 매물과 pid 없는 외부 광고 항목도 섞여
     * 있음). {@code cursor}·{@code page}를 넘겨도 같은 결과가 와서(2026-10-11 확인) 다음 페이지는 받지 않는다.
     *
     * @param bunjangCategoryId 검색 범위 번개장터 카테고리 ID(하위 카테고리 포함), null이면 전체 카테고리
     */
    public List<BunjangProductItem> search(String query, String bunjangCategoryId) {
        JsonNode root = bunjangRestClient
                .get()
                .uri(uriBuilder -> buildUri(uriBuilder, query, bunjangCategoryId))
                .retrieve()
                .body(JsonNode.class);
        return root == null
                ? List.of()
                : BunjangCategoryPage.from(root, objectMapper).items();
    }

    private static URI buildUri(UriBuilder uriBuilder, String query, String bunjangCategoryId) {
        uriBuilder.path(PATH).queryParam("q", query);
        if (bunjangCategoryId != null) {
            uriBuilder.queryParam("categoryId", bunjangCategoryId);
        }
        return uriBuilder.queryParam("sort", "score").build();
    }
}
