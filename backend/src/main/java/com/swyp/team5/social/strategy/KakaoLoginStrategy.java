package com.swyp.team5.social.strategy;

import lombok.extern.slf4j.Slf4j;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.swyp.team5.auth.dto.SocialUserInfo;
import com.swyp.team5.auth.error.InvalidSocialTokenException;
import com.swyp.team5.social.entity.SocialProvider;

/**
 * 프론트에서 전달받은 카카오 인가 코드로 액세스 토큰을 교환하고 사용자 정보를 조회한다.
 *
 * <p>구글은 ID Token을 공개키로 검증하면 끝이지만, 카카오는 인가 코드만 주므로 client_secret을 가진 백엔드가 직접 토큰을 교환해야 한다. 그래서
 * {@code verify}의 인자로 넘어오는 값은 ID Token이 아니라 인가 코드다.
 *
 * <p>리다이렉트 주소는 카카오 콘솔에 등록된 고정값이라 요청으로 받지 않고 설정에서 읽는다.
 */
@Slf4j
@Component
public class KakaoLoginStrategy implements SocialLoginStrategy {

    private static final String DEFAULT_NAME_PREFIX = "카카오회원";

    private final KakaoProperties properties;
    private final RestClient restClient;

    public KakaoLoginStrategy(KakaoProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
    }

    @Override
    public SocialProvider provider() {
        return SocialProvider.KAKAO;
    }

    /**
     * @param token 프론트가 카카오에서 받은 인가 코드
     */
    @Override
    public SocialUserInfo verify(String token) {
        String accessToken = exchangeToken(token);
        KakaoUserResponse user = requestUserInfo(accessToken);

        return toSocialUserInfo(user);
    }

    /** 인가 코드를 액세스 토큰으로 교환한다. 인가 코드는 1회용이라 재시도해도 실패한다. */
    private String exchangeToken(String authorizationCode) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", properties.getClientId());
        form.add("client_secret", properties.getClientSecret());
        form.add("redirect_uri", properties.getRedirectUri());
        form.add("code", authorizationCode);

        KakaoTokenResponse response;
        try {
            response = restClient
                    .post()
                    .uri(properties.getTokenUri())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(KakaoTokenResponse.class);
        } catch (RestClientResponseException e) {
            // 인가 코드 만료인지 redirect_uri 불일치인지는 응답 본문에만 나온다. e.getMessage() 로는 구분할 수 없다.
            log.warn("카카오 토큰 교환 실패: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new InvalidSocialTokenException("유효하지 않은 카카오 인가 코드입니다.");
        } catch (RestClientException e) {
            log.warn("카카오 토큰 교환 실패(통신 오류)", e);
            throw new InvalidSocialTokenException("유효하지 않은 카카오 인가 코드입니다.");
        }

        if (response == null || response.accessToken() == null) {
            throw new InvalidSocialTokenException("유효하지 않은 카카오 인가 코드입니다.");
        }
        return response.accessToken();
    }

    private KakaoUserResponse requestUserInfo(String accessToken) {
        KakaoUserResponse response;
        try {
            response = restClient
                    .get()
                    .uri(properties.getUserInfoUri())
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(KakaoUserResponse.class);
        } catch (RestClientResponseException e) {
            // 토큰 만료인지 권한 부족인지는 응답 본문에만 나온다.
            log.warn("카카오 사용자 정보 조회 실패: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new InvalidSocialTokenException("카카오 사용자 정보를 가져오지 못했습니다.");
        } catch (RestClientException e) {
            log.warn("카카오 사용자 정보 조회 실패(통신 오류)", e);
            throw new InvalidSocialTokenException("카카오 사용자 정보를 가져오지 못했습니다.");
        }

        if (response == null || response.id() == null) {
            throw new InvalidSocialTokenException("카카오 사용자 정보를 가져오지 못했습니다.");
        }
        return response;
    }

    /**
     * 카카오 응답을 공통 사용자 정보로 변환한다.
     *
     * <p>카카오는 이메일·닉네임이 모두 선택 동의 항목이라 값이 없을 수 있다. 이메일은 members.email 이 NULL 을 허용하므로 그대로 넘기고,
     * NOT NULL 인 name/nickname 은 값이 없으면 회원번호 기반으로 만들어 채운다.
     */
    private SocialUserInfo toSocialUserInfo(KakaoUserResponse user) {
        String providerId = String.valueOf(user.id());
        KakaoUserResponse.KakaoAccount account = user.kakaoAccount();

        String email = account != null && account.hasUsableEmail() ? account.email() : null;
        String name = resolveName(user.nicknameOrNull(), providerId);

        return new SocialUserInfo(providerId, email, name, user.profileImageUrlOrNull());
    }

    /** 닉네임 동의를 받지 못한 경우 회원번호 뒷자리로 표시 이름을 만든다. members.nickname 이 30자 제한이라 길이를 줄여 쓴다. */
    private String resolveName(String nickname, String providerId) {
        if (nickname != null && !nickname.isBlank()) {
            return nickname;
        }
        String suffix = providerId.length() > 6 ? providerId.substring(providerId.length() - 6) : providerId;
        return DEFAULT_NAME_PREFIX + suffix;
    }
}
