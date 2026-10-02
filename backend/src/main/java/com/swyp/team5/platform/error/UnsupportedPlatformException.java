package com.swyp.team5.platform.error;

import com.swyp.team5.common.error.LogDetail;

public class UnsupportedPlatformException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public UnsupportedPlatformException(String platform) {
        super("지원하지 않는 플랫폼이에요.");
        this.logDetail = "platform=" + platform;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
