package com.swyp.team5.crawl.client;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import com.swyp.team5.crawl.dto.BunjangProductDetail;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * 번개장터 개별 상품 상세 조회. page-limit 캡에 밀려 카테고리 목록에서 더 이상 관측되지 않는 매물의
 * 실제 판매 상태를 개별적으로 재확인하는 용도로 쓴다({@code GET /api/pms/v1/products/{pid}/detail/web},
 * 인증 불필요, 삭제/존재하지 않는 매물은 400 + {@code errorCode}로 응답).
 */
@Component
@RequiredArgsConstructor
public class BunjangProductClient {

    private static final String PATH = "/api/pms/v1/products/{pid}/detail/web";

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final RestClient bunjangRestClient;

    public BunjangProductDetail fetchDetail(String pid) {
        try {
            JsonNode root = bunjangRestClient.get().uri(PATH, pid).retrieve().body(JsonNode.class);
            return parseSuccess(pid, root);
        } catch (RestClientResponseException e) {
            return parseError(pid, e);
        }
    }

    private BunjangProductDetail parseSuccess(String pid, JsonNode root) {
        JsonNode product = root.path("data").path("product");
        JsonNode price = product.path("price");
        return new BunjangProductDetail(
                Long.parseLong(pid),
                textOrNull(product.path("saleStatus")),
                price.isMissingNode() || price.isNull() ? null : price.asLong(),
                textOrNull(product.path("name")),
                null);
    }

    /**
     * 400 등 에러 응답에서 {@code errorCode}만 뽑아낸다. {@code errorCode}가 확실할 때만
     * {@link BunjangProductDetail}을 반환 — 응답이 JSON이 아니거나 {@code errorCode}가 없으면(=API가
     * 확정적인 답을 준 게 아니라는 뜻) 예외를 그대로 던져 호출부가 이번 재확인을 건너뛰고 다음 사이클에
     * 재시도하게 한다("UNKNOWN" 같은 값으로 잘못 확정 짓지 않기 위함).
     */
    private BunjangProductDetail parseError(String pid, RestClientResponseException e) {
        JsonNode body = objectMapper.readTree(e.getResponseBodyAsByteArray());
        String errorCode = textOrNull(body.path("errorCode"));
        if (errorCode == null) {
            throw e;
        }
        return new BunjangProductDetail(Long.parseLong(pid), null, null, null, errorCode);
    }

    private static String textOrNull(JsonNode node) {
        return (node == null || node.isMissingNode() || node.isNull()) ? null : node.asString();
    }
}
