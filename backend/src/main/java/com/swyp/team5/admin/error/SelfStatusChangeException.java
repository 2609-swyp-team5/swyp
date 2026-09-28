package com.swyp.team5.admin.error;

/** 관리자가 자기 자신의 상태를 변경하려 한 경우. 스스로를 정지시켜 잠기는 것을 막는다. */
public class SelfStatusChangeException extends RuntimeException {

    public SelfStatusChangeException() {
        super("자신의 계정 상태는 변경할 수 없습니다.");
    }
}
