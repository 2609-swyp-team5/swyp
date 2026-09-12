package com.swyp.team5.auth.error;

public class InvalidSocialTokenException extends RuntimeException {

    public InvalidSocialTokenException(String message) {
        super(message);
    }
}
