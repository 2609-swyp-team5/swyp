package com.swyp.team5.admin.dto;

import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberStatus;

public record MemberStatusUpdateResponse(Long memberId, MemberStatus status) {

    public static MemberStatusUpdateResponse from(Member member) {
        return new MemberStatusUpdateResponse(member.getId(), member.getStatus());
    }
}
