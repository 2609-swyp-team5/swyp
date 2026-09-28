package com.swyp.team5.admin.dto;

import java.time.LocalDateTime;

import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.member.entity.MemberStatus;

/** 관리자 회원 목록의 한 행. 목록에서는 연락처 전체를 노출하지 않는다. */
public record AdminMemberListItem(
        Long memberId,
        String email,
        String name,
        String nickname,
        MemberRole role,
        MemberStatus status,
        LocalDateTime createdAt) {

    public static AdminMemberListItem from(Member member) {
        return new AdminMemberListItem(
                member.getId(),
                member.getEmail(),
                member.getName(),
                member.getNickname(),
                member.getRole(),
                member.getStatus(),
                member.getCreatedAt());
    }
}
