package com.swyp.team5.platform.error;

public class MemberPlatformNotFoundException extends RuntimeException {

    public MemberPlatformNotFoundException(Long memberId, String platformName) {
        super("연동된 플랫폼 계정이 없습니다. memberId=" + memberId + ", platform=" + platformName);
    }
}
