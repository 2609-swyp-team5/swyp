package com.swyp.team5.auth.dto;

import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.member.entity.MemberStatus;

public record SignUpResponse(
        Long memberId,
        String email,
        String nickname,
        String name,
        String phone,
        MemberRole role,
        MemberStatus status) {}
