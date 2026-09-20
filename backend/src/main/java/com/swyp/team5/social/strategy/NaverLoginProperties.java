package com.swyp.team5.social.strategy;

import lombok.Getter;
import lombok.Setter;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 네이버 로그인 설정.
 *
 * <p>파일 스토리지용 {@code cloud.naver}(NaverProperties)와는 완전히 다른 설정이라 이름을 구분했다.
 *
 * <p>clientId/clientSecret은 네이버 개발자센터 > 애플리케이션 > 개요에서 확인한다. redirectUri는 API 설정 탭의 Callback URL과 정확히 같아야 한다.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "naver")
public class NaverLoginProperties {

    private String clientId;

    private String clientSecret;

    private String redirectUri;

    /** 사용자를 네이버 로그인 화면으로 보내는 주소 */
    private String authorizeUri;

    /** 인가 코드를 액세스 토큰으로 교환하는 주소 */
    private String tokenUri;

    /** 액세스 토큰으로 사용자 정보를 조회하는 주소 */
    private String userInfoUri;
}
