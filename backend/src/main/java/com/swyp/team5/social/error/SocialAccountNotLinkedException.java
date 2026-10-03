package com.swyp.team5.social.error;

import com.swyp.team5.common.error.LogDetail;
import com.swyp.team5.social.entity.SocialProvider;

public class SocialAccountNotLinkedException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public SocialAccountNotLinkedException(Long memberId, SocialProvider provider) {
        super("연동되지 않은 소셜 계정이에요.");
        this.logDetail = "memberId=" + memberId + ", provider=" + provider;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
