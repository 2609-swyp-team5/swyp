package com.swyp.team5.auth.error;

public class InvalidTokenException extends RuntimeException {

    public InvalidTokenException() {
        super("로그인 정보가 유효하지 않거나 만료되었습니다. 다시 로그인해 주십시오.");
    }
}
