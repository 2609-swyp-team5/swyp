package com.swyp.team5.admin.error;

import com.swyp.team5.common.error.LogDetail;

public class SelfStatusChangeException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public SelfStatusChangeException(Long memberId) {
        super("자신의 계정 상태는 변경할 수 없습니다.");
        this.logDetail = "memberId=" + memberId;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
