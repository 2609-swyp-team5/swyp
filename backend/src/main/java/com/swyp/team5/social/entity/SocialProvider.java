package com.swyp.team5.social.entity;

public enum SocialProvider {
    GOOGLE,
    NAVER,
    KAKAO,
    // 전략 구현체(SocialLoginStrategy)가 아직 없어 GOOGLE 외에는 UnsupportedSocialProviderException 발생
}
