package com.swyp.team5.interest.error;

public class InterestAlreadyExistsException extends RuntimeException {

    public InterestAlreadyExistsException() {
        super("이미 관심상품으로 등록되어 있습니다.");
    }
}
