package com.swyp.team5.member.entity;

public enum SocialProvider {
    GOOGLE,
    // 전략 구현체(SocialLoginStrategy)가 아직 없어 실제로는 UnsupportedSocialProviderException 발생
    NAVER
}
