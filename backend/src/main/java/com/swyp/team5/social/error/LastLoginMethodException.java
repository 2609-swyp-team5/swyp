package com.swyp.team5.social.error;

import com.swyp.team5.common.error.LogDetail;
import com.swyp.team5.social.entity.SocialProvider;

public class LastLoginMethodException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public LastLoginMethodException(Long memberId, SocialProvider provider) {
        super("마지막 남은 로그인 수단은 해제할 수 없어요. 비밀번호를 설정하거나 다른 소셜 계정을 먼저 연동해 주세요.");
        this.logDetail = "memberId=" + memberId + ", provider=" + provider;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
