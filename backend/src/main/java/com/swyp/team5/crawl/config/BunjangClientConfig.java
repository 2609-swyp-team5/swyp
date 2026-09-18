package com.swyp.team5.crawl.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(BunjangCrawlProperties.class)
public class BunjangClientConfig {

    private static final String BASE_URL = "https://api.bunjang.co.kr";

    // robots.txt(m.bunjang.co.kr)에 ClaudeBot/anthropic-ai 등 Claude·Anthropic 계열 User-Agent는
    // 사이트 전체가 차단되어 있어 해당 문자열을 쓰지 않는다. 브라우저로 위장하지도 않고, 자체
    // 서비스임을 알 수 있는 정직한 식별자를 사용한다.
    private static final String USER_AGENT = "JigeuminiPriceBot/1.0";

    @Bean
    public RestClient bunjangRestClient() {
        return RestClient.builder()
                .baseUrl(BASE_URL)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.ORIGIN, "https://m.bunjang.co.kr")
                .defaultHeader(HttpHeaders.REFERER, "https://m.bunjang.co.kr/")
                .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
                .build();
    }
}
