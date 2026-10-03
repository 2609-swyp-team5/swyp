package com.swyp.team5.admin.dto;

import java.time.LocalDateTime;

import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberStatus;

public record AdminMemberListItemResponse(
        Long memberId, String email, String nickname, MemberStatus status, LocalDateTime createdAt) {

    public static AdminMemberListItemResponse from(Member member) {
        return new AdminMemberListItemResponse(
                member.getId(), member.getEmail(), member.getNickname(), member.getStatus(), member.getCreatedAt());
    }
}
