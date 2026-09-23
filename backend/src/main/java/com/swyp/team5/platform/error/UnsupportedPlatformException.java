package com.swyp.team5.platform.error;

public class UnsupportedPlatformException extends RuntimeException {

    public UnsupportedPlatformException(String platform) {
        super("지원하지 않는 플랫폼입니다: " + platform);
    }
}
