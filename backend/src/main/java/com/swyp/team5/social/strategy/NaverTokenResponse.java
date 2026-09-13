package com.swyp.team5.social.strategy;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 네이버 토큰 발급 응답.
 *
 * <p>네이버는 인가 코드가 틀려도 HTTP 200에 {@code error} 필드를 담아 돌려주는 경우가 있어, 상태 코드만으로는 실패를 알 수 없다. 그래서 에러 필드까지 함께
 * 받는다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record NaverTokenResponse(
        @JsonProperty("access_token") String accessToken,
        String error,
        @JsonProperty("error_description") String errorDescription) {}
