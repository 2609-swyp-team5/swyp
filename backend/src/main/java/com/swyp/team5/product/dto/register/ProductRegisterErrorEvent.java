package com.swyp.team5.product.dto.register;

import org.springframework.http.HttpStatus;

import com.swyp.team5.common.common.ApiError;

/**
 * 단계별 스트리밍 등록(v2)의 {@code error} 이벤트 데이터. 일반 에러 응답({@code ApiResponse})과 같은 형태에 실패한
 * 단계({@code step})를 더했다. 스트림이 열린 뒤라 HTTP 상태는 200이므로, 실패 여부는 이 이벤트로만 판단한다.
 *
 * @param step 실패한 단계(타임아웃이면 그때 진행 중이던 단계)
 */
public record ProductRegisterErrorEvent(
        boolean success, String message, Object data, ApiError error, ProductRegisterStep step) {

    public static ProductRegisterErrorEvent of(
            ProductRegisterStep step, HttpStatus status, String code, String message) {
        return new ProductRegisterErrorEvent(false, message, null, ApiError.of(status, code), step);
    }
}
