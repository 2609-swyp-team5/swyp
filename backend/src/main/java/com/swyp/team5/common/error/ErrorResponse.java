package com.swyp.team5.common.error;

import org.springframework.http.HttpStatus;

import com.swyp.team5.common.filter.RequestLoggingFilter;
import org.slf4j.MDC;

public record ErrorResponse(int status, String message, String traceId) {

    public static ErrorResponse of(HttpStatus status, String message) {
        return new ErrorResponse(status.value(), message, MDC.get(RequestLoggingFilter.TRACE_ID_MDC_KEY));
    }
}
