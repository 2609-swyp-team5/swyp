package com.swyp.team5.interest.controller;

import java.util.List;

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
import com.swyp.team5.common.passport.PrincipalMember;
import com.swyp.team5.interest.dto.InterestCreateResponse;
import com.swyp.team5.interest.dto.InterestListItemResponse;
import com.swyp.team5.interest.dto.InterestRegisterRequest;
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
     * 인증된 본인의 관심상품 목록을 조회한다.
     *
     * @param currentMember 인증된 요청자
     * @param page 페이지 번호(0-base, 기본 0)
     * @param size 페이지 크기(기본 10)
     * @return 200 OK + 관심상품 목록
     */
    @Operation(summary = "관심상품 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<List<InterestListItemResponse>>> getInterests(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(
                ApiResponse.success(interestService.getInterests(currentMember.memberId(), page, size)));
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
