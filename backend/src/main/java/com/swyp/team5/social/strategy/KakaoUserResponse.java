package com.swyp.team5.social.strategy;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 카카오 사용자 정보 응답.
 *
 * <p>닉네임과 이메일은 선택 동의 항목이라 사용자가 동의하지 않으면 내려오지 않는다.
 *
 * @param id 카카오 회원번호. 연결을 끊었다 다시 맺어도 유지되므로 사용자 식별 기준으로 쓴다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record KakaoUserResponse(Long id, @JsonProperty("kakao_account") KakaoAccount kakaoAccount) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record KakaoAccount(
            @JsonProperty("has_email") Boolean hasEmail,
            @JsonProperty("email_needs_agreement") Boolean emailNeedsAgreement,
            @JsonProperty("is_email_valid") Boolean isEmailValid,
            @JsonProperty("is_email_verified") Boolean isEmailVerified,
            String email,
            Profile profile) {

        /** 동의를 받았고 카카오 기준으로도 유효한 이메일일 때만 사용한다. */
        public boolean hasUsableEmail() {
            return Boolean.TRUE.equals(hasEmail)
                    && !Boolean.TRUE.equals(emailNeedsAgreement)
                    && Boolean.TRUE.equals(isEmailValid)
                    && email != null
                    && !email.isBlank();
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Profile(String nickname, @JsonProperty("profile_image_url") String profileImageUrl) {}

    public String nicknameOrNull() {
        if (kakaoAccount == null || kakaoAccount.profile() == null) {
            return null;
        }
        return kakaoAccount.profile().nickname();
    }

    public String profileImageUrlOrNull() {
        if (kakaoAccount == null || kakaoAccount.profile() == null) {
            return null;
        }
        return kakaoAccount.profile().profileImageUrl();
    }
}
