package com.swyp.team5.social.strategy;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import com.swyp.team5.auth.error.UnsupportedSocialProviderException;
import com.swyp.team5.social.entity.SocialProvider;

@Component
@RequiredArgsConstructor
public class SocialAuthorizationUrlFactory {

    private final KakaoProperties kakaoProperties;

    private final NaverLoginProperties naverProperties;

    public String create(SocialProvider provider, String state) {
        return switch (provider) {
            case KAKAO -> build(
                    kakaoProperties.getAuthorizeUri(),
                    kakaoProperties.getClientId(),
                    kakaoProperties.getRedirectUri(),
                    state);
            case NAVER -> build(
                    naverProperties.getAuthorizeUri(),
                    naverProperties.getClientId(),
                    naverProperties.getRedirectUri(),
                    state);
            case GOOGLE -> throw new UnsupportedSocialProviderException(provider.name());
        };
    }

    private String build(String authorizeUri, String clientId, String redirectUri, String state) {
        return UriComponentsBuilder.fromUriString(authorizeUri)
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_type", "code")
                .queryParam("state", state)
                .build()
                .toUriString();
    }
}
