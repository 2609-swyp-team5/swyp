package com.swyp.team5.social.dto;

import java.time.LocalDateTime;

import com.swyp.team5.social.entity.Social;
import com.swyp.team5.social.entity.SocialProvider;

/**
 * 회원에게 연동된 소셜 계정.
 *
 * @param provider 소셜 제공자(GOOGLE/KAKAO/NAVER)
 * @param createdAt 연동 일시(소셜 로그인으로 가입했으면 가입 일시)
 */
public record SocialAccountResponse(SocialProvider provider, LocalDateTime createdAt) {

    public static SocialAccountResponse from(Social social) {
        return new SocialAccountResponse(social.getProvider(), social.getCreatedAt());
    }
}
