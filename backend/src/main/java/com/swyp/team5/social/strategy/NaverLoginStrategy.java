package com.swyp.team5.social.strategy;

import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import com.swyp.team5.auth.dto.SocialUserInfo;
import com.swyp.team5.auth.error.InvalidSocialTokenException;
import com.swyp.team5.social.entity.SocialProvider;

/**
 * 프론트에서 전달받은 네이버 인가 코드로 액세스 토큰을 교환하고 사용자 정보를 조회한다.
 *
 * <p>흐름은 카카오와 같지만 두 가지가 다르다. 토큰 요청을 폼 본문이 아니라 쿼리 파라미터로 보내고, {@code state} 파라미터를 필수로 요구한다.
 *
 * <p>리다이렉트 주소는 네이버 콘솔에 등록된 고정값이라 요청으로 받지 않고 설정에서 읽는다.
 */
@Slf4j
@Component
public class NaverLoginStrategy implements SocialLoginStrategy {

    private static final String DEFAULT_NAME_PREFIX = "네이버회원";

    private final NaverLoginProperties properties;
    private final RestClient restClient;

    public NaverLoginStrategy(NaverLoginProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
    }

    @Override
    public SocialProvider provider() {
        return SocialProvider.NAVER;
    }

    /**
     * @param token 프론트가 네이버에서 받은 인가 코드
     */
    @Override
    public SocialUserInfo verify(String token) {
        String accessToken = exchangeToken(token);
        NaverUserResponse.Response user = requestUserInfo(accessToken);

        return toSocialUserInfo(user);
    }

    /** 인가 코드를 액세스 토큰으로 교환한다. 인가 코드는 1회용이라 재시도해도 실패한다. */
    private String exchangeToken(String authorizationCode) {
        String uri = UriComponentsBuilder.fromUriString(properties.getTokenUri())
                .queryParam("grant_type", "authorization_code")
                .queryParam("client_id", properties.getClientId())
                .queryParam("client_secret", properties.getClientSecret())
                .queryParam("redirect_uri", properties.getRedirectUri())
                .queryParam("code", authorizationCode)
                .queryParam("state", properties.getState())
                .build()
                .toUriString();

        NaverTokenResponse response;
        try {
            response = restClient.get().uri(uri).retrieve().body(NaverTokenResponse.class);
        } catch (RestClientResponseException e) {
            // 인가 코드 만료인지 state 불일치인지는 응답 본문에만 나온다. e.getMessage() 로는 구분할 수 없다.
            log.warn("네이버 토큰 교환 실패: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new InvalidSocialTokenException("유효하지 않은 네이버 인가 코드입니다.");
        } catch (RestClientException e) {
            log.warn("네이버 토큰 교환 실패(통신 오류)", e);
            throw new InvalidSocialTokenException("유효하지 않은 네이버 인가 코드입니다.");
        }

        // 네이버는 실패해도 200에 error 필드를 담아 돌려주므로 본문까지 확인해야 한다.
        if (response == null || response.accessToken() == null) {
            log.warn(
                    "네이버 토큰 교환 실패: error={}, description={}",
                    response == null ? null : response.error(),
                    response == null ? null : response.errorDescription());
            throw new InvalidSocialTokenException("유효하지 않은 네이버 인가 코드입니다.");
        }
        return response.accessToken();
    }

    private NaverUserResponse.Response requestUserInfo(String accessToken) {
        NaverUserResponse response;
        try {
            response = restClient
                    .get()
                    .uri(properties.getUserInfoUri())
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(NaverUserResponse.class);
        } catch (RestClientResponseException e) {
            // 토큰 만료인지 권한 부족인지는 응답 본문에만 나온다.
            log.warn("네이버 사용자 정보 조회 실패: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new InvalidSocialTokenException("네이버 사용자 정보를 가져오지 못했습니다.");
        } catch (RestClientException e) {
            log.warn("네이버 사용자 정보 조회 실패(통신 오류)", e);
            throw new InvalidSocialTokenException("네이버 사용자 정보를 가져오지 못했습니다.");
        }

        if (response == null || !response.isSuccess()) {
            log.warn("네이버 사용자 정보 조회 실패: {}", response == null ? null : response.message());
            throw new InvalidSocialTokenException("네이버 사용자 정보를 가져오지 못했습니다.");
        }
        return response.response();
    }

    /**
     * 네이버 응답을 공통 사용자 정보로 변환한다.
     *
     * <p>네이버는 이메일·이름을 필수 제공 항목으로 설정할 수 있어 카카오보다 값이 채워질 가능성이 높지만, 콘솔 설정과 사용자 동의에 따라 비어 올 수 있으므로 카카오와
     * 같은 방식으로 방어한다.
     */
    private SocialUserInfo toSocialUserInfo(NaverUserResponse.Response user) {
        String providerId = user.id();
        String email = isBlank(user.email()) ? null : user.email();
        String name = resolveName(user.nickname(), user.name(), providerId);

        return new SocialUserInfo(providerId, email, name, user.profileImage());
    }

    /** 닉네임 > 이름 순으로 쓰고, 둘 다 없으면 회원번호 뒷자리로 표시 이름을 만든다. members.nickname 이 30자 제한이라 길이를 줄여 쓴다. */
    private String resolveName(String nickname, String name, String providerId) {
        if (!isBlank(nickname)) {
            return nickname;
        }
        if (!isBlank(name)) {
            return name;
        }
        String suffix = providerId.length() > 6 ? providerId.substring(providerId.length() - 6) : providerId;
        return DEFAULT_NAME_PREFIX + suffix;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
