package com.swyp.team5.platform.error;

import com.swyp.team5.common.error.LogDetail;

/** 외부 플랫폼(번개장터 등)에 매물을 자동 등록하던 중 실패한 경우(폼 요소 탐색 실패, 등록 API 오류 등). */
public class PlatformPublishFailedException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public PlatformPublishFailedException(String message) {
        this(message, null, null);
    }

    public PlatformPublishFailedException(String message, String logDetail) {
        this(message, logDetail, null);
    }

    public PlatformPublishFailedException(String message, String logDetail, Throwable cause) {
        super(message, cause);
        this.logDetail = logDetail;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
