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
@EnableConfigurationProperties(JoongnaCrawlProperties.class)
public class JoongnaClientConfig {

    private static final String SEARCH_BASE_URL = "https://search-api.joongna.com";
    private static final String PRODUCT_BASE_URL = "https://product-api.joongna.com";
    private static final String USER_AGENT = "JigeuminiPriceBot/1.0";
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(10);

    @Bean
    public RestClient joongnaSearchRestClient() {
        return restClient(SEARCH_BASE_URL);
    }

    @Bean
    public RestClient joongnaProductRestClient() {
        return restClient(PRODUCT_BASE_URL);
    }

    private static RestClient restClient(String baseUrl) {
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build());
        requestFactory.setReadTimeout(READ_TIMEOUT);

        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.ORIGIN, "https://web.joongna.com")
                .defaultHeader(HttpHeaders.REFERER, "https://web.joongna.com/")
                .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
                .build();
    }
}
