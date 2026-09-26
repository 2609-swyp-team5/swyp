package com.swyp.team5.platform.bunjang.controller;

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
import org.springframework.web.bind.annotation.RestController;

import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.common.passport.PrincipalMember;
import com.swyp.team5.platform.bunjang.dto.BunjangConnectRequest;
import com.swyp.team5.platform.bunjang.dto.BunjangConnectionResponse;
import com.swyp.team5.platform.bunjang.dto.ProductPlatformLinkRequest;
import com.swyp.team5.platform.bunjang.dto.ProductPlatformResponse;
import com.swyp.team5.platform.bunjang.service.BunjangConnectionService;
import com.swyp.team5.platform.bunjang.service.BunjangProductLinkService;
import com.swyp.team5.platform.bunjang.service.BunjangProductPublishService;
import com.swyp.team5.platform.entity.PlatformType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * 외부 플랫폼 연동 API. 회원이 직접 로그인해 얻은 세션을 등록해 두면, 그 세션으로 우리 상품을 대신
 * 등록(게시)하거나, 직접 등록한 매물 주소를 연동해 상태를 확인·추적한다. 경로의 {@code platform}은 여러
 * 플랫폼을 염두에 둔 자리로 {@link PlatformType}(대소문자 무관)으로 받는다. 현재는 번개장터만 있어 서비스가
 * 번개장터 전용이며, 두 번째 플랫폼이 추가되면 {@code platform} 값으로 플랫폼별 서비스를 고르도록 확장한다.
 * 지원하지 않는 값은 경로 바인딩 단계에서 400으로 거절된다.
 */
@Tag(name = "Bunjang", description = "외부 플랫폼(번개장터 등) 연동")
@RestController
@RequiredArgsConstructor
public class BunjangController {

    private final BunjangConnectionService bunjangConnectionService;
    private final BunjangProductLinkService bunjangProductLinkService;
    private final BunjangProductPublishService bunjangProductPublishService;

    @Operation(summary = "플랫폼 세션 연동/재연동")
    @PostMapping("/platforms/{platform}/connect")
    public ResponseEntity<ApiResponse<BunjangConnectionResponse>> connect(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable PlatformType platform,
            @Valid @RequestBody BunjangConnectRequest request) {
        BunjangConnectionResponse response =
                bunjangConnectionService.connect(currentMember.memberId(), request.cookie());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "플랫폼 연동 상태 조회")
    @GetMapping("/platforms/{platform}")
    public ResponseEntity<ApiResponse<BunjangConnectionResponse>> getStatus(
            @AuthenticationPrincipal PrincipalMember currentMember, @PathVariable PlatformType platform) {
        return ResponseEntity.ok(ApiResponse.success(bunjangConnectionService.getStatus(currentMember.memberId())));
    }

    @Operation(summary = "플랫폼 연동 해제")
    @DeleteMapping("/platforms/{platform}")
    public ResponseEntity<ApiResponse<Void>> disconnect(
            @AuthenticationPrincipal PrincipalMember currentMember, @PathVariable PlatformType platform) {
        bunjangConnectionService.disconnect(currentMember.memberId());
        return ResponseEntity.ok(ApiResponse.<Void>success(null));
    }

    @Operation(summary = "상품을 플랫폼에 등록(게시)")
    @PostMapping("/products/{productId}/platforms/{platform}/publish")
    public ResponseEntity<ApiResponse<ProductPlatformResponse>> publish(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable Long productId,
            @PathVariable PlatformType platform) {
        ProductPlatformResponse response = bunjangProductPublishService.publish(currentMember.memberId(), productId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @Operation(summary = "이미 등록된 플랫폼 매물을 상품에 연동")
    @PostMapping("/products/{productId}/platforms/{platform}")
    public ResponseEntity<ApiResponse<ProductPlatformResponse>> link(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable Long productId,
            @PathVariable PlatformType platform,
            @Valid @RequestBody ProductPlatformLinkRequest request) {
        ProductPlatformResponse response =
                bunjangProductLinkService.link(currentMember.memberId(), productId, request.productUrl());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @Operation(summary = "연동된 플랫폼 매물의 판매 상태 동기화")
    @PatchMapping("/products/{productId}/platforms/{platform}/sync")
    public ResponseEntity<ApiResponse<ProductPlatformResponse>> syncStatus(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable Long productId,
            @PathVariable PlatformType platform) {
        ProductPlatformResponse response = bunjangProductLinkService.syncStatus(currentMember.memberId(), productId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
