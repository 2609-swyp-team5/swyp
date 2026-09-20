package com.swyp.team5.auth.error;

public class InvalidPasswordResetTokenException extends RuntimeException {

    public InvalidPasswordResetTokenException() {
        super("유효하지 않거나 만료된 재설정 토큰입니다.");
    }
}
