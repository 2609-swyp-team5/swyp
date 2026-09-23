package com.swyp.team5.member.error;

public class MemberNotFoundException extends RuntimeException {

    public MemberNotFoundException(Long memberId) {
        super("회원을 찾을 수 없습니다: " + memberId);
    }
}
