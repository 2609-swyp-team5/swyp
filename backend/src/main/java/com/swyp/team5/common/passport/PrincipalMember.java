package com.swyp.team5.common.passport;

import com.swyp.team5.member.entity.MemberRole;

/** JWT 인증 필터가 SecurityContext에 심는 인증 객체
 * 컨트롤러에서 @AuthenticationPrincipal 사용으로 조회가능 */
public record PrincipalMember(Long memberId, MemberRole role) {}
