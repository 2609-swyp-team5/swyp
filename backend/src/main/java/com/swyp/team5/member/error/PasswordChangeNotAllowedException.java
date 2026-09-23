package com.swyp.team5.member.error;

public class PasswordChangeNotAllowedException extends RuntimeException {

    public PasswordChangeNotAllowedException() {
        super("소셜 로그인으로 가입한 계정은 비밀번호를 변경할 수 없습니다.");
    }
}
