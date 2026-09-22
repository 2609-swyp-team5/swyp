package com.swyp.team5.member.dto;

import com.swyp.team5.member.entity.Member;

public record MemberResponse(
        Long memberId, String email, String name, String nickname, String phone, String profileImageUrl) {

    public static MemberResponse from(Member member) {
        return new MemberResponse(
                member.getId(),
                member.getEmail(),
                member.getName(),
                member.getNickname(),
                member.getPhone(),
                member.getProfileImageUrl());
    }
}
