package com.swyp.team5.auth.error;

public class DuplicatePhoneException extends RuntimeException {

    public DuplicatePhoneException(String phone) {
        super("이미 사용 중인 휴대폰 번호입니다: " + phone);
    }
}
