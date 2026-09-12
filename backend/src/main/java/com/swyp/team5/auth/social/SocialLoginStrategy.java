package com.swyp.team5.auth.social;

import com.swyp.team5.auth.dto.SocialUserInfo;
import com.swyp.team5.member.entity.SocialProvider;

/** 소셜 로그인 provider별 토큰 검증 전략. provider 추가 시 이 인터페이스 구현체만 추가 */
public interface SocialLoginStrategy {

    SocialProvider provider();

    /** 프론트에서 전달받은 토큰을 검증해 사용자 정보를 반환한다. 검증 실패 시 InvalidSocialTokenException. */
    SocialUserInfo verify(String token);
}
