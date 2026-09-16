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

    /** 인가 코드를 액세스 토큰으로 교환하는 주소 */
    private String tokenUri;

    /** 액세스 토큰으로 사용자 정보를 조회하는 주소 */
    private String userInfoUri;

    /**
     * 네이버 토큰 발급 시 필수로 요구하는 state 값.
     *
     * <p>원래는 요청마다 서버가 난수를 만들어 저장해두고 콜백에서 대조해 로그인 CSRF를 막아야 한다. 지금은 인증 URL을 프론트가 만들기 때문에 서버에 대조할 기준값이
     * 없어, 프론트와 약속한 고정값으로 파라미터 요구만 충족한다. 방어 효과는 없으며 실사용자를 받기 전에 서버 발급 방식으로 바꿔야 한다.
     */
    private String state;
}
