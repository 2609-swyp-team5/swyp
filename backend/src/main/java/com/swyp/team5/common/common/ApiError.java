package com.swyp.team5.common.common;

import java.util.List;

import org.springframework.http.HttpStatus;

public record ApiError(String status, String code, List<ErrorDetail> details) {

    public static ApiError of(HttpStatus status, String code) {
        return of(status, code, null);
    }

    public static ApiError of(HttpStatus status, String code, List<ErrorDetail> details) {
        return new ApiError(String.valueOf(status.value()), code, details);
    }
}
