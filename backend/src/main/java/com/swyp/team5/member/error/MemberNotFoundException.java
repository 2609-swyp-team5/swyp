package com.swyp.team5.member.error;

import com.swyp.team5.common.error.LogDetail;

public class MemberNotFoundException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public MemberNotFoundException(Long memberId) {
        super("회원 정보를 찾을 수 없습니다.");
        this.logDetail = "memberId=" + memberId;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
