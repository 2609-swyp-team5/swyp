package com.swyp.team5.platform.error;

import com.swyp.team5.common.error.LogDetail;

public class InvalidProductUrlException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public InvalidProductUrlException(String message, String logDetail) {
        super(message);
        this.logDetail = logDetail;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
