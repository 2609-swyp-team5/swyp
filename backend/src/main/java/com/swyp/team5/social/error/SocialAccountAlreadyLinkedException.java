package com.swyp.team5.social.error;

import com.swyp.team5.common.error.LogDetail;
import com.swyp.team5.social.entity.SocialProvider;

public class SocialAccountAlreadyLinkedException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public SocialAccountAlreadyLinkedException(Long memberId, SocialProvider provider, String reason) {
        super("이미 연동된 소셜 계정이에요.");
        this.logDetail = "memberId=" + memberId + ", provider=" + provider + ", reason=" + reason;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
