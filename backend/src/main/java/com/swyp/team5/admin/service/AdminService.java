package com.swyp.team5.admin.service;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.swyp.team5.admin.dto.AdminDashboardResponse;
import com.swyp.team5.admin.dto.AdminMemberDetailResponse;
import com.swyp.team5.admin.dto.AdminMemberListItemResponse;
import com.swyp.team5.admin.dto.MemberStatusUpdateResponse;
import com.swyp.team5.admin.error.InvalidMemberStatusException;
import com.swyp.team5.admin.error.SelfStatusChangeException;
import com.swyp.team5.auth.service.RefreshTokenService;
import com.swyp.team5.common.common.PageResponse;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberStatus;
import com.swyp.team5.member.error.MemberNotFoundException;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.product.repository.ProductRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final MemberRepository memberRepository;

    private final ProductRepository productRepository;

    private final RefreshTokenService refreshTokenService;

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboard() {
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        return new AdminDashboardResponse(
                memberRepository.countByStatusNot(MemberStatus.DELETED),
                productRepository.count(),
                memberRepository.countByCreatedAtGreaterThanEqual(startOfToday),
                productRepository.countByCreatedAtGreaterThanEqual(startOfToday));
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminMemberListItemResponse> getMembers(
            MemberStatus status, String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id"));
        Specification<Member> spec = Specification.where(hasStatus(status)).and(hasKeyword(keyword));
        Page<Member> members = memberRepository.findAll(spec, pageable);
        return PageResponse.of(members, AdminMemberListItemResponse::from);
    }

    @Transactional(readOnly = true)
    public AdminMemberDetailResponse getMember(Long memberId) {
        Member member = findMember(memberId);
        return toDetail(member);
    }

    @Transactional
    public MemberStatusUpdateResponse changeMemberStatus(
            Long adminMemberId, Long memberId, MemberStatus status, String reason) {
        if (adminMemberId.equals(memberId)) {
            throw new SelfStatusChangeException(memberId);
        }
        if (status != MemberStatus.ACTIVE && status != MemberStatus.SUSPENDED) {
            throw new InvalidMemberStatusException("회원 상태는 ACTIVE 또는 SUSPENDED로만 변경할 수 있습니다.");
        }

        Member member = findMember(memberId);
        if (member.getStatus() == MemberStatus.DELETED) {
            throw new InvalidMemberStatusException("이미 탈퇴한 회원입니다.");
        }

        MemberStatus previous = member.getStatus();
        if (status == MemberStatus.SUSPENDED) {
            member.suspend(StringUtils.hasText(reason) ? reason.trim() : null);
            refreshTokenService.delete(memberId);
        } else {
            member.activate();
        }
        log.info(
                "관리자가 회원 상태를 변경했습니다. adminMemberId={}, memberId={}, {} -> {}",
                adminMemberId,
                memberId,
                previous,
                status);
        return MemberStatusUpdateResponse.from(member);
    }

    private Member findMember(Long memberId) {
        return memberRepository.findById(memberId).orElseThrow(() -> new MemberNotFoundException(memberId));
    }

    private AdminMemberDetailResponse toDetail(Member member) {
        return AdminMemberDetailResponse.from(member, productRepository.countByMemberId(member.getId()));
    }

    private static Specification<Member> hasStatus(MemberStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    private static Specification<Member> hasKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return null;
            }
            String pattern = "%" + keyword.trim().toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("email")), pattern), cb.like(cb.lower(root.get("nickname")), pattern));
        };
    }
}
