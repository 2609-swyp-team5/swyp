package com.swyp.team5.social.strategy;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.swyp.team5.auth.dto.SocialUserInfo;
import com.swyp.team5.auth.error.InvalidSocialTokenException;
import com.swyp.team5.social.entity.SocialProvider;

/** 프론트에서 전달받은 구글 ID Token을 구글 공개키로 검증해 사용자 정보를 추출한다. */
@Component
public class GoogleLoginStrategy implements SocialLoginStrategy {

    private final GoogleIdTokenVerifier verifier;

    public GoogleLoginStrategy(@Value("${google.client-id}") String clientId) {
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(clientId))
                .build();
    }

    @Override
    public SocialProvider provider() {
        return SocialProvider.GOOGLE;
    }

    @Override
    public SocialUserInfo verify(String token) {
        try {
            GoogleIdToken idToken = verifier.verify(token);
            if (idToken == null) {
                throw new InvalidSocialTokenException("유효하지 않은 구글 토큰입니다.");
            }
            GoogleIdToken.Payload payload = idToken.getPayload();
            if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
                throw new InvalidSocialTokenException("이메일이 확인되지 않은 구글 계정입니다.");
            }
            return new SocialUserInfo(payload.getSubject(), payload.getEmail(), (String) payload.get("name"), (String)
                    payload.get("picture"));
        } catch (GeneralSecurityException | IOException | IllegalArgumentException e) {
            throw new InvalidSocialTokenException("유효하지 않은 구글 토큰입니다.");
        }
    }
}
