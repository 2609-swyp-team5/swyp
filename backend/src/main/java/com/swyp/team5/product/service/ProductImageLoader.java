package com.swyp.team5.product.service;

import java.net.URI;
import java.time.Duration;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import com.swyp.team5.file.dto.InMemoryMultipartFile;

/**
 * 이미 업로드된 상품 이미지를 공개 URL로 내려받아 AI 사진 분석({@link ProductAiService#analyze})에 넘길 파일로 만든다.
 * 스토리지 종류(R2/S3/Naver/로컬)와 무관하게 URL만으로 동작하도록 HTTP로 읽는다. 상품 수정 시 유지하는 기존 이미지를 다시
 * 분석할 때 쓰며, 호출하는 쪽은 그 상품에 실제로 등록된 이미지 URL만 넘겨야 한다(임의 URL 요청 방지).
 */
@Component
public class ProductImageLoader {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(15);

    private final RestClient restClient;

    public ProductImageLoader() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT);
        requestFactory.setReadTimeout(READ_TIMEOUT);
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    /**
     * 이미지를 내려받는다.
     *
     * @param url 업로드된 이미지의 공개 URL
     * @return 이미지 파일(응답에 Content-Type이 없으면 {@code null} — 분석 시 image/jpeg로 취급)
     * @throws org.springframework.web.client.RestClientException 이미지를 내려받지 못한 경우
     * @throws IllegalStateException 내용이 비어 있는 경우
     */
    public MultipartFile load(String url) {
        ResponseEntity<byte[]> response =
                restClient.get().uri(URI.create(url)).retrieve().toEntity(byte[].class);
        byte[] body = response.getBody();
        if (body == null || body.length == 0) {
            throw new IllegalStateException("상품 이미지 내용이 비어 있습니다: " + url);
        }
        MediaType contentType = response.getHeaders().getContentType();
        String path = URI.create(url).getPath();
        String filename = path == null ? "" : path.substring(path.lastIndexOf('/') + 1);
        return InMemoryMultipartFile.of("images", filename, contentType == null ? null : contentType.toString(), body);
    }
}
