package com.swyp.team5.interest.controller;

import java.util.Set;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.common.common.CursorPageResponse;
import com.swyp.team5.common.passport.PrincipalMember;
import com.swyp.team5.interest.dto.InterestCreateResponse;
import com.swyp.team5.interest.dto.InterestListItemResponse;
import com.swyp.team5.interest.dto.InterestRegisterRequest;
import com.swyp.team5.interest.dto.InterestStatus;
import com.swyp.team5.interest.dto.InterestToggleResponse;
import com.swyp.team5.interest.dto.TargetPriceRequest;
import com.swyp.team5.interest.dto.TargetPriceResponse;
import com.swyp.team5.interest.service.InterestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * 관심상품 API. 우리 회원 상품과 외부 플랫폼 수집 매물 양쪽 다 대상이 될 수 있다.
 */
@Tag(name = "Interest", description = "관심 상품")
@RestController
@RequestMapping("/interests")
@RequiredArgsConstructor
public class InterestController {

    private final InterestService interestService;

    /**
     * 상품 또는 외부 플랫폼 수집 매물을 관심상품으로 등록한다.
     *
     * @param currentMember 인증된 요청자
     * @param request 등록 대상(source/targetId)
     * @return 201 Created + 생성된 관심상품 ID
     */
    @Operation(summary = "관심상품 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<InterestCreateResponse>> register(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @Valid @RequestBody InterestRegisterRequest request) {
        InterestCreateResponse response =
                interestService.register(currentMember.memberId(), request.source(), request.targetId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    /**
     * 관심상품 등록 상태를 토글한다. 이미 등록돼 있으면 해제하고, 아니면 등록한다(하트 버튼용 — 기존 등록·삭제 API도 그대로 사용
     * 가능).
     *
     * @param currentMember 인증된 요청자
     * @param request 대상(source/targetId)
     * @return 200 OK + 호출 후 등록 상태({@code interested})와 관심상품 ID(해제됐으면 null)
     */
    @Operation(summary = "관심상품 등록 토글")
    @PostMapping("/toggle")
    public ResponseEntity<ApiResponse<InterestToggleResponse>> toggle(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @Valid @RequestBody InterestRegisterRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                interestService.toggle(currentMember.memberId(), request.source(), request.targetId())));
    }

    /**
     * 인증된 본인의 관심상품 목록을 커서 기반으로 조회한다(정렬은 {@code interestId} 내림차순 = 등록 최신순).
     *
     * @param currentMember 인증된 요청자
     * @param status 관심상품 상태 필터(선택, BUY/WAIT/SOLD_OUT/PENDING 복수 — 응답 항목의 {@code interestStatus} 기준)
     * @param cursor 이전 페이지 마지막 관심상품의 {@code interestId}(선택, 첫 페이지는 생략)
     * @param size 페이지 크기(기본 10)
     * @return 200 OK + 커서 페이지 응답
     */
    @Operation(summary = "관심상품 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<CursorPageResponse<InterestListItemResponse>>> getInterests(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @RequestParam(required = false) Set<InterestStatus> status,
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(
                ApiResponse.success(interestService.getInterests(currentMember.memberId(), status, cursor, size)));
    }

    /**
     * 관심상품 등록을 취소한다.
     *
     * @param currentMember 인증된 요청자
     * @param interestId 취소할 관심상품 ID
     * @return 200 OK
     */
    @Operation(summary = "관심상품 삭제")
    @DeleteMapping("/{interestId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal PrincipalMember currentMember, @PathVariable Long interestId) {
        interestService.delete(currentMember.memberId(), interestId);
        return ResponseEntity.ok(ApiResponse.<Void>success(null));
    }

    /**
     * 관심상품의 목표가를 설정(재설정)한다.
     *
     * @param currentMember 인증된 요청자
     * @param interestId 대상 관심상품 ID
     * @param request 목표가 요청 바디
     * @return 200 OK + 반영된 목표가
     */
    @Operation(summary = "목표가 설정")
    @PatchMapping("/{interestId}/target-price")
    public ResponseEntity<ApiResponse<TargetPriceResponse>> setTargetPrice(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable Long interestId,
            @Valid @RequestBody TargetPriceRequest request) {
        TargetPriceResponse response =
                interestService.setTargetPrice(currentMember.memberId(), interestId, request.targetPrice());
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
