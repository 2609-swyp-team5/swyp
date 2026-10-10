package com.swyp.team5.crawl.client;

import java.util.Map;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import com.swyp.team5.crawl.dto.JoongnaProductDetail;
import tools.jackson.databind.JsonNode;

@Component
@RequiredArgsConstructor
public class JoongnaProductClient {

    private static final String PATH = "/basic/{productSeq}";
    private static final String DELETED_STATUS = "DELETED";
    private static final Map<Integer, String> STATUS_BY_CODE = Map.of(
            0, "SELLING",
            1, "RESERVED",
            2, "HOLDING",
            3, "SOLD_OUT",
            4, DELETED_STATUS,
            5, "HIDDEN",
            6, "HIDDEN",
            9, "SOLD_OUT");

    private final RestClient joongnaProductRestClient;

    public JoongnaProductDetail fetchDetail(String productSeq) {
        try {
            JsonNode data = joongnaProductRestClient
                    .get()
                    .uri(PATH, productSeq)
                    .retrieve()
                    .body(JsonNode.class)
                    .path("data");
            JsonNode price = data.path("productPrice");
            JsonNode title = data.path("productTitle");
            return new JoongnaProductDetail(
                    STATUS_BY_CODE.getOrDefault(data.path("productStatus").asInt(-1), DELETED_STATUS),
                    price.isMissingNode() || price.isNull() ? null : price.asLong(),
                    title.isMissingNode() || title.isNull() ? null : title.asString());
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode().isSameCodeAs(HttpStatus.GONE)
                    || e.getStatusCode().isSameCodeAs(HttpStatus.NOT_FOUND)) {
                return new JoongnaProductDetail(DELETED_STATUS, null, null);
            }
            throw e;
        }
    }
}
