package com.swyp.team5.admin.error;

/** 관리자가 지정할 수 없는 회원 상태로 변경을 시도한 경우. */
public class InvalidMemberStatusException extends RuntimeException {

    public InvalidMemberStatusException(String message) {
        super(message);
    }
}
