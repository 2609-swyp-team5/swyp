package com.swyp.team5.social.strategy;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/** 카카오 토큰 발급 응답. 우리는 사용자 정보 조회에 쓸 액세스 토큰만 사용한다. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record KakaoTokenResponse(@JsonProperty("access_token") String accessToken) {}
