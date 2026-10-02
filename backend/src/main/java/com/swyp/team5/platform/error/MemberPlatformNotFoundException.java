package com.swyp.team5.platform.error;

import com.swyp.team5.common.error.LogDetail;

public class MemberPlatformNotFoundException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public MemberPlatformNotFoundException(Long memberId, String platformName) {
        super("연동된 플랫폼 계정이 없어요. 먼저 계정을 연동해 주세요.");
        this.logDetail = "memberId=" + memberId + ", platform=" + platformName;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
