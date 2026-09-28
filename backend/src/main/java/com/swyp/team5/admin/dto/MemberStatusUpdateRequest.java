package com.swyp.team5.admin.dto;

import jakarta.validation.constraints.NotNull;

import com.swyp.team5.member.entity.MemberStatus;

/**
 * 회원 정지/해제 요청.
 *
 * @param status 변경할 상태. {@code SUSPENDED}(정지) 또는 {@code ACTIVE}(해제)만 허용한다.
 *     탈퇴({@code DELETED})는 회원 본인만 할 수 있으므로 이 API로는 지정할 수 없다.
 */
public record MemberStatusUpdateRequest(@NotNull MemberStatus status) {}
