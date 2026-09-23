package com.swyp.team5.platform.bunjang.config;

import java.net.http.HttpClient;
import java.time.Duration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * 회원이 직접 발급받아 등록한 번개장터 로그인 세션(bun_session)으로, 본인 명의 계정을 대신 호출하는
 * 용도의 클라이언트 설정(번개장터 웹 앱이 호출하는 API 서버 {@code api.bunjang.co.kr} 기준 — {@code bunjang.co.kr/api/...}는
 * 모바일 웹으로 301 리다이렉트된 뒤 로그인 여부와 무관하게 HTML을 돌려줘 검증에 쓸 수 없다). {@code crawl.config.BunjangClientConfig}의 익명 시세 수집 클라이언트와 달리
 * 실제 로그인 세션을 사용해 인증이 필요한 API(내 상점 정보 등)를 호출해야 하므로, 실제 브라우저와
 * 동일한 User-Agent를 사용한다(회원 본인이 위임한 인증된 요청이라는 점에서 익명 크롤링과 성격이 다르다).
 */
@Configuration
public class BunjangSessionClientConfig {

    private static final String BASE_URL = "https://api.bunjang.co.kr";

    private static final String USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            + "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(10);

    @Bean
    public RestClient bunjangSessionRestClient() {
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build());
        requestFactory.setReadTimeout(READ_TIMEOUT);

        return RestClient.builder()
                .baseUrl(BASE_URL)
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.ORIGIN, "https://m.bunjang.co.kr")
                .defaultHeader(HttpHeaders.REFERER, "https://m.bunjang.co.kr/")
                .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
                .build();
    }
}
