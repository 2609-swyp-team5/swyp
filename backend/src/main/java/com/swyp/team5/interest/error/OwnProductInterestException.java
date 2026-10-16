package com.swyp.team5.interest.error;

/** 판매자가 자기 상품을 관심 등록하려 할 때. 같은 상품에 판매자용·구매자용 알림이 함께 가지 않도록 거절한다. */
public class OwnProductInterestException extends RuntimeException {

    public OwnProductInterestException() {
        super("내가 등록한 상품은 관심 상품으로 담을 수 없어요.");
    }
}
