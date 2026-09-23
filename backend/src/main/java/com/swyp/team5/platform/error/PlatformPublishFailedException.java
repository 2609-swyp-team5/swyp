package com.swyp.team5.platform.error;

/** 외부 플랫폼(번개장터 등)에 매물을 자동 등록하던 중 실패한 경우(폼 요소 탐색 실패, 등록 API 오류 등). */
public class PlatformPublishFailedException extends RuntimeException {

    public PlatformPublishFailedException(String message) {
        super(message);
    }

    public PlatformPublishFailedException(String message, Throwable cause) {
        super(message, cause);
    }
}
