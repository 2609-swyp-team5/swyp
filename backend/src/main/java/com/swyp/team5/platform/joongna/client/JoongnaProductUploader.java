package com.swyp.team5.platform.joongna.client;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.swyp.team5.platform.error.InvalidPlatformSessionException;
import com.swyp.team5.platform.error.PlatformPublishFailedException;
import com.swyp.team5.platform.joongna.dto.JoongnaListingForm;
import com.swyp.team5.platform.joongna.dto.JoongnaSession;
import tools.jackson.databind.JsonNode;

@Slf4j
@Component
@RequiredArgsConstructor
public class JoongnaProductUploader {

    private static final String USER_INFO_PATH = "/user/info/seq";
    private static final String SIGNED_URL_PATH = "/file/aws/signed/url";
    private static final String ADD_PATH = "/basic/add";
    private static final String STATUS_PATH = "/status";
    private static final int DELETED_STATUS = 4;
    private static final String REMOVE_FAILED_MESSAGE = "중고나라 매물 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해 주십시오.";
    private static final int MAX_IMAGES = 10;
    private static final int NEW_PRODUCT_CONDITION = 0;
    private static final int USED_PRODUCT_CONDITION = 2;
    private static final int PARCEL_TRADE_TYPE = 2;
    private static final String DEFAULT_CONTENT_TYPE = "image/jpeg";
    private static final Duration IMAGE_TIMEOUT = Duration.ofSeconds(15);
    private static final String SESSION_EXPIRED_MESSAGE = "중고나라 계정 연결이 만료되었습니다. 다시 연결해 주십시오.";
    private static final String FAILED_MESSAGE = "중고나라 매물 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해 주십시오.";

    private final RestClient joongnaApiRestClient;
    private final RestClient joongnaPublishRestClient;

    private final HttpClient imageHttpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public String upload(JoongnaSession session, JoongnaListingForm form) {
        String authorization = "Bearer " + session.accessToken();
        try {
            long storeSeq = fetchStoreSeq(authorization);
            List<Map<String, Object>> media = uploadImages(authorization, form.imageUrls());
            JsonNode root = joongnaPublishRestClient
                    .post()
                    .uri(ADD_PATH)
                    .header("Authorization", authorization)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(listingBody(form, storeSeq, media))
                    .retrieve()
                    .body(JsonNode.class);
            String productSeq = requireSuccess(root, "add").path("data").asString("");
            if (productSeq.isBlank()) {
                throw new PlatformPublishFailedException(FAILED_MESSAGE, "step=add, 상품번호 없음");
            }
            log.info("중고나라 매물 등록 완료. productSeq={}, imageCount={}", productSeq, media.size());
            return productSeq;
        } catch (RestClientResponseException e) {
            HttpStatus status = HttpStatus.resolve(e.getStatusCode().value());
            if (status == HttpStatus.UNAUTHORIZED || status == HttpStatus.FORBIDDEN) {
                throw new InvalidPlatformSessionException(SESSION_EXPIRED_MESSAGE);
            }
            throw new PlatformPublishFailedException(
                    FAILED_MESSAGE,
                    "status=" + e.getStatusCode().value() + ", body=" + truncate(e.getResponseBodyAsString()),
                    e);
        } catch (RestClientException e) {
            throw new PlatformPublishFailedException(
                    FAILED_MESSAGE, e.getClass().getSimpleName(), e);
        }
    }

    public void remove(JoongnaSession session, String productSeq) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("buyerStoreSeq", 0);
        body.put("orderType", 0);
        body.put("productSeq", Long.parseLong(productSeq));
        body.put("status", DELETED_STATUS);
        try {
            JsonNode root = joongnaPublishRestClient
                    .put()
                    .uri(STATUS_PATH)
                    .header("Authorization", "Bearer " + session.accessToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            requireSuccess(root, "remove");
            log.info("중고나라 매물 삭제 완료. productSeq={}", productSeq);
        } catch (RestClientResponseException e) {
            HttpStatus status = HttpStatus.resolve(e.getStatusCode().value());
            if (status == HttpStatus.UNAUTHORIZED || status == HttpStatus.FORBIDDEN) {
                throw new InvalidPlatformSessionException(SESSION_EXPIRED_MESSAGE);
            }
            throw new PlatformPublishFailedException(
                    REMOVE_FAILED_MESSAGE,
                    "step=remove, status=" + e.getStatusCode().value() + ", body="
                            + truncate(e.getResponseBodyAsString()),
                    e);
        } catch (RestClientException e) {
            throw new PlatformPublishFailedException(
                    REMOVE_FAILED_MESSAGE, e.getClass().getSimpleName(), e);
        }
    }

    private long fetchStoreSeq(String authorization) {
        JsonNode storeSeq = joongnaApiRestClient
                .get()
                .uri(USER_INFO_PATH)
                .header("Authorization", authorization)
                .retrieve()
                .body(JsonNode.class)
                .path("data")
                .path("storeSeq");
        if (storeSeq.isMissingNode() || storeSeq.isNull()) {
            throw new InvalidPlatformSessionException(SESSION_EXPIRED_MESSAGE);
        }
        return storeSeq.asLong();
    }

    private List<Map<String, Object>> uploadImages(String authorization, List<String> imageUrls) {
        List<Image> images =
                imageUrls.stream().limit(MAX_IMAGES).map(this::download).toList();
        if (images.isEmpty()) {
            throw new PlatformPublishFailedException("중고나라에 등록할 상품 이미지가 없습니다.");
        }
        List<String> fileNames = new ArrayList<>();
        for (int i = 0; i < images.size(); i++) {
            fileNames.add("image-" + (i + 1) + "." + images.get(i).extension());
        }
        JsonNode root = joongnaPublishRestClient
                .post()
                .uri(SIGNED_URL_PATH)
                .header("Authorization", authorization)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("fileNames", fileNames))
                .retrieve()
                .body(JsonNode.class);
        JsonNode results = requireSuccess(root, "signedUrl").path("data").path("fileResultData");
        List<JsonNode> targets = new ArrayList<>();
        if (results.isArray()) {
            results.forEach(targets::add);
        } else if (results.isObject()) {
            targets.add(results);
        }
        if (targets.size() != images.size()) {
            throw new PlatformPublishFailedException(
                    FAILED_MESSAGE, "step=signedUrl, expected=" + images.size() + ", actual=" + targets.size());
        }

        List<Map<String, Object>> media = new ArrayList<>();
        for (int i = 0; i < images.size(); i++) {
            JsonNode target = targets.get(i);
            putToStorage(target.path("s3UploadUrl").asString(""), images.get(i));
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("mainYn", i == 0 ? 1 : 0);
            item.put("watermarkYn", 1);
            item.put("productMediaSeq", 0);
            item.put("mediaUrl", target.path("mediaUrl").asString(""));
            item.put("originUrl", "");
            item.put("thumbnailUrl", target.path("thumbnailUrl").asString(""));
            item.put("waterMarkUrl", target.path("waterMarkUrl").asString(""));
            item.put("waterMarkLogoUrl", "");
            item.put("mediaSort", i);
            item.put("mediaStatus", 0);
            item.put("mediaType", 0);
            media.add(item);
        }
        return media;
    }

    private Image download(String imageUrl) {
        HttpRequest request = HttpRequest.newBuilder(URI.create(imageUrl))
                .timeout(IMAGE_TIMEOUT)
                .GET()
                .build();
        try {
            HttpResponse<byte[]> response = imageHttpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() / 100 != 2) {
                throw new PlatformPublishFailedException(
                        "상품 이미지를 내려받지 못했습니다. 잠시 후 다시 시도해 주십시오.",
                        "status=" + response.statusCode() + ", url=" + imageUrl);
            }
            String contentType = response.headers()
                    .firstValue("Content-Type")
                    .filter(value -> value.startsWith("image/"))
                    .map(value -> value.split(";")[0].strip())
                    .orElse(DEFAULT_CONTENT_TYPE);
            return new Image(response.body(), contentType);
        } catch (IOException e) {
            throw new PlatformPublishFailedException("상품 이미지를 내려받지 못했습니다. 잠시 후 다시 시도해 주십시오.", imageUrl, e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new PlatformPublishFailedException("상품 이미지 다운로드가 중단되었습니다. 잠시 후 다시 시도해 주십시오.", null, e);
        }
    }

    private void putToStorage(String uploadUrl, Image image) {
        if (uploadUrl.isBlank()) {
            throw new PlatformPublishFailedException(FAILED_MESSAGE, "step=storage, 업로드 주소 없음");
        }
        HttpRequest request = HttpRequest.newBuilder(URI.create(uploadUrl))
                .timeout(IMAGE_TIMEOUT)
                .header("Content-Type", image.contentType())
                .header("Os-Type", "2")
                .PUT(HttpRequest.BodyPublishers.ofByteArray(image.bytes()))
                .build();
        try {
            HttpResponse<Void> response = imageHttpClient.send(request, HttpResponse.BodyHandlers.discarding());
            if (response.statusCode() / 100 != 2) {
                throw new PlatformPublishFailedException(
                        FAILED_MESSAGE, "step=storage, status=" + response.statusCode());
            }
        } catch (IOException e) {
            throw new PlatformPublishFailedException(
                    FAILED_MESSAGE, "step=storage, " + e.getClass().getSimpleName(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new PlatformPublishFailedException(FAILED_MESSAGE, "step=storage, interrupted", e);
        }
    }

    private static Map<String, Object> listingBody(
            JoongnaListingForm form, long storeSeq, List<Map<String, Object>> media) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("media", media);
        body.put("keywords", List.of());
        body.put("locations", List.of());
        body.put("productTitle", form.title());
        body.put("productCategory", form.categorySeq());
        body.put("productStatus", 0);
        body.put(
                "condition",
                Map.of("productCondition", form.newProduct() ? NEW_PRODUCT_CONDITION : USED_PRODUCT_CONDITION));
        body.put("componentExistType", 0);
        body.put("qty", 1);
        body.put("productTradeType", PARCEL_TRADE_TYPE);
        body.put("additional", Map.of("perPersonPurchaseCnt", "0", "doorDeliveryYn", 0));
        body.put("addType", "BASIC");
        body.put("pickupShops", List.of());
        body.put("freeSharing", false);
        body.put("productDescription", form.description());
        body.put("productPrice", String.valueOf(form.price()));
        body.put("deliveryInfos", List.of());
        body.put("parcelFeeYn", form.parcelFeeIncluded() ? 1 : 0);
        body.put("storeSeq", storeSeq);
        return body;
    }

    private static JsonNode requireSuccess(JsonNode root, String step) {
        JsonNode meta = root == null ? null : root.path("meta");
        if (meta == null || meta.path("code").asInt(-1) != 0) {
            String message = meta == null ? "" : meta.path("message").asString("");
            throw new PlatformPublishFailedException(
                    message.isBlank() ? FAILED_MESSAGE : "중고나라 매물 등록이 거절되었습니다: " + message,
                    "step=" + step + ", code="
                            + (meta == null ? "none" : meta.path("code").asString("")));
        }
        return root;
    }

    private static String truncate(String text) {
        return text == null || text.length() <= 300 ? text : text.substring(0, 300);
    }

    private record Image(byte[] bytes, String contentType) {

        String extension() {
            return switch (contentType) {
                case "image/png" -> "png";
                case "image/webp" -> "webp";
                case "image/gif" -> "gif";
                default -> "jpg";
            };
        }
    }
}
