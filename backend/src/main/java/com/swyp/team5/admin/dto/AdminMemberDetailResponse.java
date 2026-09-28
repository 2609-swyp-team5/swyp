package com.swyp.team5.admin.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.member.entity.MemberStatus;
import com.swyp.team5.social.entity.SocialProvider;

/**
 * 관리자 회원 상세.
 *
 * @param socialProviders 연동된 소셜 제공자 목록(일반 가입만 했으면 빈 목록)
 * @param productCount 이 회원이 등록한 상품 수
 */
public record AdminMemberDetailResponse(
        Long memberId,
        String email,
        String phone,
        String name,
        String nickname,
        String profileImageUrl,
        MemberRole role,
        MemberStatus status,
        List<SocialProvider> socialProviders,
        long productCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static AdminMemberDetailResponse of(Member member, List<SocialProvider> socialProviders, long productCount) {
        return new AdminMemberDetailResponse(
                member.getId(),
                member.getEmail(),
                member.getPhone(),
                member.getName(),
                member.getNickname(),
                member.getProfileImageUrl(),
                member.getRole(),
                member.getStatus(),
                socialProviders,
                productCount,
                member.getCreatedAt(),
                member.getUpdatedAt());
    }
}
