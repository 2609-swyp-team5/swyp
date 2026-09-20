package com.swyp.team5.social.strategy;

import com.swyp.team5.auth.dto.SocialUserInfo;
import com.swyp.team5.social.entity.SocialProvider;

/** 소셜 로그인 provider별 토큰 검증 전략. provider 추가 시 이 인터페이스 구현체만 추가 */
public interface SocialLoginStrategy {

    SocialProvider provider();

    /** 프론트에서 전달받은 토큰을 검증해 사용자 정보를 반환한다. 검증 실패 시 InvalidSocialTokenException. */
    SocialUserInfo verify(String token);

    /** 토큰 교환에 state 가 필요한 provider 만 재정의한다. 그 외에는 state 를 쓰지 않는다. */
    default SocialUserInfo verify(String token, String state) {
        return verify(token);
    }
}
