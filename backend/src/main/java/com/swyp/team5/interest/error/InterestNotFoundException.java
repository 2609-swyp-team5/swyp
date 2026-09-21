package com.swyp.team5.interest.error;

public class InterestNotFoundException extends RuntimeException {

    public InterestNotFoundException() {
        super("존재하지 않는 관심상품입니다.");
    }
}
