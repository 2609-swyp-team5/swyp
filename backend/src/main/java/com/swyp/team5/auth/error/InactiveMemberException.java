package com.swyp.team5.auth.error;

import com.swyp.team5.member.entity.MemberStatus;

public class InactiveMemberException extends RuntimeException {

    public InactiveMemberException(MemberStatus status) {
        super(
                switch (status) {
                    case SUSPENDED -> "이용이 제한된 계정입니다.";
                    case DELETED -> "탈퇴한 계정입니다.";
                    case ACTIVE -> "이용할 수 없는 계정입니다.";
                });
    }
}
