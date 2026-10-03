package com.swyp.team5.admin.dto;

import java.time.LocalDateTime;

import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.member.entity.MemberStatus;

public record AdminMemberDetailResponse(
        Long memberId,
        String email,
        String nickname,
        MemberRole role,
        MemberStatus status,
        long productCount,
        LocalDateTime createdAt) {

    public static AdminMemberDetailResponse from(Member member, long productCount) {
        return new AdminMemberDetailResponse(
                member.getId(),
                member.getEmail(),
                member.getNickname(),
                member.getRole(),
                member.getStatus(),
                productCount,
                member.getCreatedAt());
    }
}
