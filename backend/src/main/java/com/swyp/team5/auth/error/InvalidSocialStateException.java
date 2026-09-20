package com.swyp.team5.auth.error;

public class InvalidSocialStateException extends RuntimeException {

    public InvalidSocialStateException() {
        super("잘못된 소셜 로그인 요청입니다.");
    }
}
