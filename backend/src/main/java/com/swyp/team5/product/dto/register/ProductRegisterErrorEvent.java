package com.swyp.team5.product.dto.register;

/**
 * 단계별 스트리밍 등록·수정(SSE)의 최종 실패 이벤트 {@code data}. 이벤트는 기존 에러 응답과 같은 {@code ApiResponse} 형태
 * ({@code success=false}, {@code message}, {@code error})로 보내고, 이 객체에 이벤트 종류와 실패한 단계를 담는다. 스트림이
 * 열린 뒤라 HTTP 상태는 200이므로, 실패 여부는 이 이벤트로만 판단한다.
 *
 * @param event 이벤트 종류(항상 {@code error})
 * @param step 실패한 단계(타임아웃이면 그때 진행 중이던 단계)
 */
public record ProductRegisterErrorEvent(String event, ProductRegisterStep step) {

    public static final String EVENT = "error";

    public static ProductRegisterErrorEvent of(ProductRegisterStep step) {
        return new ProductRegisterErrorEvent(EVENT, step);
    }
}
