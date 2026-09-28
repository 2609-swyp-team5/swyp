package com.swyp.team5.admin.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.swyp.team5.admin.dto.AdminDashboardResponse;
import com.swyp.team5.admin.dto.AdminMemberDetailResponse;
import com.swyp.team5.admin.dto.AdminMemberListItem;
import com.swyp.team5.admin.error.InvalidMemberStatusException;
import com.swyp.team5.admin.error.InvalidProductStatusException;
import com.swyp.team5.admin.error.SelfStatusChangeException;
import com.swyp.team5.admin.repository.MemberSearchSpecification;
import com.swyp.team5.auth.service.RefreshTokenService;
import com.swyp.team5.common.common.PageResponse;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberStatus;
import com.swyp.team5.member.error.MemberNotFoundException;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.social.entity.Social;
import com.swyp.team5.social.entity.SocialProvider;
import com.swyp.team5.social.repository.SocialRepository;

/** 관리자 전용 기능. 호출 권한은 {@code SecurityConfig}의 {@code /admin/**} 규칙이 보장한다. */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final MemberRepository memberRepository;

    private final ProductRepository productRepository;

    private final SocialRepository socialRepository;

    private final RefreshTokenService refreshTokenService;

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboard() {
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        return new AdminDashboardResponse(
                memberRepository.count(),
                memberRepository.countByStatus(MemberStatus.ACTIVE),
                memberRepository.countByStatus(MemberStatus.SUSPENDED),
                memberRepository.countByStatus(MemberStatus.DELETED),
                memberRepository.countByCreatedAtGreaterThanEqual(startOfToday),
                productRepository.count(),
                productRepository.countByStatus(ProductStatus.ON_SALE),
                productRepository.countByStatus(ProductStatus.HIDDEN),
                productRepository.countByCreatedAtGreaterThanEqual(startOfToday));
    }

    /**
     * 회원 목록을 가입 최신순으로 조회한다.
     *
     * @param status 상태 필터({@code null}이면 전체)
     * @param keyword 이메일·이름·닉네임 부분 일치 검색어(공백/{@code null}이면 전체)
     */
    @Transactional(readOnly = true)
    public PageResponse<AdminMemberListItem> getMembers(MemberStatus status, String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id"));
        String normalizedKeyword = StringUtils.hasText(keyword) ? keyword.trim() : null;
        Page<Member> members =
                memberRepository.findAll(MemberSearchSpecification.of(status, normalizedKeyword), pageable);
        return PageResponse.of(members, AdminMemberListItem::from);
    }

    /**
     * @throws MemberNotFoundException 해당 회원이 없는 경우
     */
    @Transactional(readOnly = true)
    public AdminMemberDetailResponse getMember(Long memberId) {
        Member member = findMember(memberId);
        List<SocialProvider> providers = socialRepository.findByMemberId(memberId).stream()
                .map(Social::getProvider)
                .toList();
        return AdminMemberDetailResponse.of(member, providers, productRepository.countByMemberId(memberId));
    }

    /**
     * 회원을 정지하거나 정지를 해제한다. 정지하면 저장된 Refresh Token을 지워 재발급을 막는다
     * (남아 있는 Access Token은 만료될 때까지 유효하다).
     *
     * @throws SelfStatusChangeException 자기 자신을 대상으로 한 경우
     * @throws InvalidMemberStatusException {@code ACTIVE}/{@code SUSPENDED} 외의 상태이거나, 이미 탈퇴한 회원인 경우
     * @throws MemberNotFoundException 해당 회원이 없는 경우
     */
    @Transactional
    public AdminMemberDetailResponse changeMemberStatus(Long adminMemberId, Long memberId, MemberStatus status) {
        if (adminMemberId.equals(memberId)) {
            throw new SelfStatusChangeException();
        }
        if (status != MemberStatus.ACTIVE && status != MemberStatus.SUSPENDED) {
            throw new InvalidMemberStatusException("회원 상태는 ACTIVE 또는 SUSPENDED로만 변경할 수 있습니다.");
        }

        Member member = findMember(memberId);
        if (member.getStatus() == MemberStatus.DELETED) {
            throw new InvalidMemberStatusException("이미 탈퇴한 회원입니다.");
        }

        MemberStatus previous = member.getStatus();
        member.changeStatus(status);
        if (status == MemberStatus.SUSPENDED) {
            refreshTokenService.delete(memberId);
        }
        log.info(
                "관리자가 회원 상태를 변경했습니다. adminMemberId={}, memberId={}, {} -> {}",
                adminMemberId,
                memberId,
                previous,
                status);

        List<SocialProvider> providers = socialRepository.findByMemberId(memberId).stream()
                .map(Social::getProvider)
                .toList();
        return AdminMemberDetailResponse.of(member, providers, productRepository.countByMemberId(memberId));
    }

    /**
     * 상품 게시를 중단하거나 복구한다. 중단은 {@code HIDDEN}, 복구는 {@code ON_SALE}로 지정한다.
     * 거래 상태({@code RESERVED}/{@code SOLD_OUT})는 판매자가 관리하는 값이라 관리자가 덮어쓸 수 없다.
     *
     * @throws InvalidProductStatusException {@code ON_SALE}/{@code HIDDEN} 외의 상태를 지정한 경우
     * @throws ProductNotFoundException 해당 상품이 없는 경우
     */
    @Transactional
    public void changeProductStatus(Long adminMemberId, Long productId, ProductStatus status) {
        if (status != ProductStatus.ON_SALE && status != ProductStatus.HIDDEN) {
            throw new InvalidProductStatusException();
        }

        Product product =
                productRepository.findById(productId).orElseThrow(() -> new ProductNotFoundException(productId));
        ProductStatus previous = product.getStatus();
        product.changeStatus(status);
        log.info(
                "관리자가 상품 게시 상태를 변경했습니다. adminMemberId={}, productId={}, {} -> {}",
                adminMemberId,
                productId,
                previous,
                status);
    }

    private Member findMember(Long memberId) {
        return memberRepository.findById(memberId).orElseThrow(() -> new MemberNotFoundException(memberId));
    }
}
