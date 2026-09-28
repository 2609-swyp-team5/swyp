package com.swyp.team5.admin.controller;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.swyp.team5.admin.dto.AdminDashboardResponse;
import com.swyp.team5.admin.dto.AdminMemberDetailResponse;
import com.swyp.team5.admin.dto.AdminMemberListItem;
import com.swyp.team5.admin.dto.MemberStatusUpdateRequest;
import com.swyp.team5.admin.service.AdminService;
import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.common.common.PageResponse;
import com.swyp.team5.common.passport.PrincipalMember;
import com.swyp.team5.member.entity.MemberStatus;
import com.swyp.team5.product.dto.ProductStatusUpdateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/** 관리자 API. 전 구간 ADMIN 권한이 필요하며, 권한이 없으면 403으로 막힌다. */
@Tag(name = "Admin", description = "관리자")
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @Operation(summary = "대시보드 통계 조회")
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> getDashboard() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getDashboard()));
    }

    /**
     * @param status 상태 필터(미지정 시 전체)
     * @param keyword 이메일·이름·닉네임 검색어(미지정 시 전체)
     * @param page 페이지 번호(0-base, 기본 0)
     * @param size 페이지 크기(기본 20)
     */
    @Operation(summary = "회원 목록 조회")
    @GetMapping("/members")
    public ResponseEntity<ApiResponse<PageResponse<AdminMemberListItem>>> getMembers(
            @RequestParam(required = false) MemberStatus status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(adminService.getMembers(status, keyword, page, size)));
    }

    @Operation(summary = "회원 상세 조회")
    @GetMapping("/members/{memberId}")
    public ResponseEntity<ApiResponse<AdminMemberDetailResponse>> getMember(@PathVariable Long memberId) {
        return ResponseEntity.ok(ApiResponse.success(adminService.getMember(memberId)));
    }

    @Operation(summary = "회원 정지/해제")
    @PatchMapping("/members/{memberId}/status")
    public ResponseEntity<ApiResponse<AdminMemberDetailResponse>> changeMemberStatus(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable Long memberId,
            @Valid @RequestBody MemberStatusUpdateRequest request) {
        AdminMemberDetailResponse response =
                adminService.changeMemberStatus(currentMember.memberId(), memberId, request.status());
        String message = request.status() == MemberStatus.SUSPENDED ? "회원을 정지했습니다." : "회원 정지를 해제했습니다.";
        return ResponseEntity.ok(ApiResponse.success(message, response));
    }

    /** 게시 중단은 {@code HIDDEN}, 복구는 {@code ON_SALE}로 요청한다. 그 외 상태는 400으로 거절한다. */
    @Operation(summary = "상품 게시 중단/복구")
    @PatchMapping("/products/{productId}/status")
    public ResponseEntity<ApiResponse<Void>> changeProductStatus(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable Long productId,
            @Valid @RequestBody ProductStatusUpdateRequest request) {
        adminService.changeProductStatus(currentMember.memberId(), productId, request.status());
        return ResponseEntity.ok(ApiResponse.success("상품 게시 상태를 변경했습니다.", null));
    }
}
