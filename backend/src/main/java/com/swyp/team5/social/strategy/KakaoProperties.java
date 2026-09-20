package com.swyp.team5.social.strategy;

import lombok.Getter;
import lombok.Setter;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 카카오 로그인 설정.
 *
 * <p>clientId는 카카오 콘솔의 REST API 키, clientSecret은 콘솔에서 발급한 Client Secret이다. Client Secret은 기본 활성화 상태라 토큰 발급 시
 * 반드시 포함해야 한다.
 *
 * <p>redirectUri는 프론트가 인가 코드를 받는 주소이며, 카카오 콘솔에 등록한 값과 정확히 같아야 한다.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "kakao")
public class KakaoProperties {

    private String clientId;

    private String clientSecret;

    private String redirectUri;

    /** 사용자를 카카오 로그인 화면으로 보내는 주소 */
    private String authorizeUri;

    /** 인가 코드를 액세스 토큰으로 교환하는 주소 */
    private String tokenUri;

    /** 액세스 토큰으로 사용자 정보를 조회하는 주소 */
    private String userInfoUri;
}
