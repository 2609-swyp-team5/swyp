package com.swyp.team5.crawl.config;

import java.net.http.HttpClient;
import java.time.Duration;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties({BunjangCrawlProperties.class, ListingReconciliationProperties.class})
public class BunjangClientConfig {

    private static final String BASE_URL = "https://api.bunjang.co.kr";

    // robots.txt(m.bunjang.co.kr)에 ClaudeBot/anthropic-ai 등 Claude·Anthropic 계열 User-Agent는
    // 사이트 전체가 차단되어 있어 해당 문자열을 쓰지 않는다. 브라우저로 위장하지도 않고, 자체
    // 서비스임을 알 수 있는 정직한 식별자를 사용한다.
    private static final String USER_AGENT = "JigeuminiPriceBot/1.0";

    // 타임아웃이 없으면 응답이 느린 카테고리 하나가 전체 수집 주기를 무한정 붙잡을 수 있어 설정한다.
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(10);

    @Bean
    public RestClient bunjangRestClient() {
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
