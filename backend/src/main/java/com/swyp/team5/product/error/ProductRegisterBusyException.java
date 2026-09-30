package com.swyp.team5.product.error;

public class ProductRegisterBusyException extends RuntimeException {

    public ProductRegisterBusyException() {
        super("등록·수정 요청이 많아 지금은 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    }
}
