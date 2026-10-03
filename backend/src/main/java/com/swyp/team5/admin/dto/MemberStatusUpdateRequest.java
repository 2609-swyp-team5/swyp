package com.swyp.team5.admin.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.swyp.team5.member.entity.MemberStatus;

public record MemberStatusUpdateRequest(@NotNull MemberStatus status, @Size(max = 500) String content) {}
