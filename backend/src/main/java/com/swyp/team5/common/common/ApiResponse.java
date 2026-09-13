package com.swyp.team5.common.common;

public record ApiResponse<T>(boolean success, String message, T data, ApiError error) {

    private static final String DEFAULT_SUCCESS_MESSAGE = "요청이 성공적으로 처리되었습니다.";

    public static <T> ApiResponse<T> success(T data) {
        return success(DEFAULT_SUCCESS_MESSAGE, data);
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data, null);
    }

    public static <T> ApiResponse<T> error(String message, ApiError error) {
        return new ApiResponse<>(false, message, null, error);
    }
}
