package com.swyp.team5.admin.error;

/** 관리자가 지정할 수 없는 상품 상태로 변경을 시도한 경우. */
public class InvalidProductStatusException extends RuntimeException {

    public InvalidProductStatusException() {
        super("상품 게시 상태는 ON_SALE 또는 HIDDEN으로만 변경할 수 있습니다.");
    }
}
