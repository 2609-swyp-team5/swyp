package com.swyp.team5.auth.error;

public class UnsupportedSocialProviderException extends RuntimeException {

    public UnsupportedSocialProviderException(String provider) {
        super("지원하지 않는 소셜 로그인 provider입니다: " + provider);
    }
}
