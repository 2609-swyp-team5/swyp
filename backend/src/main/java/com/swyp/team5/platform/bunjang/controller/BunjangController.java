package com.swyp.team5.platform.bunjang.controller;

import java.util.Arrays;
import java.util.List;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
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
import com.swyp.team5.platform.bunjang.dto.PlatformConnectionResponse;
import com.swyp.team5.platform.bunjang.dto.ProductPlatformLinkRequest;
import com.swyp.team5.platform.bunjang.dto.ProductPlatformResponse;
import com.swyp.team5.platform.bunjang.service.BunjangConnectionService;
import com.swyp.team5.platform.bunjang.service.BunjangProductLinkService;
import com.swyp.team5.platform.bunjang.service.BunjangProductPublishService;
import com.swyp.team5.platform.entity.PlatformType;
import com.swyp.team5.platform.error.UnsupportedPlatformException;
import com.swyp.team5.platform.joongna.service.JoongnaConnectionService;
import com.swyp.team5.platform.joongna.service.JoongnaProductLinkService;
import com.swyp.team5.platform.joongna.service.JoongnaProductPublishService;
import com.swyp.team5.platform.verification.PlatformVerificationService;
import com.swyp.team5.platform.verification.dto.PlatformVerificationConfirmRequest;
import com.swyp.team5.platform.verification.dto.PlatformVerificationConfirmResponse;
import com.swyp.team5.platform.verification.dto.PlatformVerificationRequest;
import com.swyp.team5.platform.verification.dto.PlatformVerificationResponse;
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
    private final PlatformVerificationService platformVerificationService;
    private final JoongnaConnectionService joongnaConnectionService;
    private final JoongnaProductPublishService joongnaProductPublishService;
    private final JoongnaProductLinkService joongnaProductLinkService;

    @Value("${platform.listed-platforms:BUNJANG}")
    private List<String> listedPlatforms = List.of(PlatformType.BUNJANG.name());

    @Operation(summary = "플랫폼 세션 연동/재연동")
    @PostMapping("/platforms/{platform}/connect")
    public ResponseEntity<ApiResponse<BunjangConnectionResponse>> connect(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable PlatformType platform,
            @Valid @RequestBody BunjangConnectRequest request) {
        requireBunjang(platform);
        BunjangConnectionResponse response =
                bunjangConnectionService.connect(currentMember.memberId(), request.cookie());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "본인인증으로 플랫폼 연동 - 인증 문자 요청")
    @PostMapping("/platforms/{platform}/verification")
    public ResponseEntity<ApiResponse<PlatformVerificationResponse>> requestVerification(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable PlatformType platform,
            @Valid @RequestBody PlatformVerificationRequest request) {
        PlatformVerificationResponse response =
                platformVerificationService.request(currentMember.memberId(), platform, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "본인인증으로 플랫폼 연동 - 인증번호 확인")
    @PostMapping("/platforms/{platform}/verification/{verificationId}/confirm")
    public ResponseEntity<ApiResponse<PlatformVerificationConfirmResponse>> confirmVerification(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable PlatformType platform,
            @PathVariable String verificationId,
            @Valid @RequestBody PlatformVerificationConfirmRequest request) {
        PlatformVerificationConfirmResponse response =
                platformVerificationService.confirm(currentMember.memberId(), platform, verificationId, request.otp());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "외부 플랫폼 연동 목록 조회")
    @GetMapping("/platforms")
    public ResponseEntity<ApiResponse<List<PlatformConnectionResponse>>> getConnections(
            @AuthenticationPrincipal PrincipalMember currentMember) {
        List<PlatformConnectionResponse> response = Arrays.stream(PlatformType.values())
                .filter(platform -> listedPlatforms.contains(platform.name()))
                .map(platform -> PlatformConnectionResponse.of(platform, statusOf(platform, currentMember.memberId())))
                .toList();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "플랫폼 연동 상태 조회")
    @GetMapping("/platforms/{platform}")
    public ResponseEntity<ApiResponse<BunjangConnectionResponse>> getStatus(
            @AuthenticationPrincipal PrincipalMember currentMember, @PathVariable PlatformType platform) {
        return ResponseEntity.ok(ApiResponse.success(statusOf(platform, currentMember.memberId())));
    }

    @Operation(summary = "플랫폼 연동 해제")
    @DeleteMapping("/platforms/{platform}")
    public ResponseEntity<ApiResponse<Void>> disconnect(
            @AuthenticationPrincipal PrincipalMember currentMember, @PathVariable PlatformType platform) {
        switch (platform) {
            case BUNJANG -> bunjangConnectionService.disconnect(currentMember.memberId());
            case JOONGNA -> joongnaConnectionService.disconnect(currentMember.memberId());
        }
        return ResponseEntity.ok(ApiResponse.<Void>success(null));
    }

    @Operation(summary = "상품을 플랫폼에 등록(게시)")
    @PostMapping("/products/{productId}/platforms/{platform}/publish")
    public ResponseEntity<ApiResponse<ProductPlatformResponse>> publish(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable Long productId,
            @PathVariable PlatformType platform) {
        ProductPlatformResponse response =
                switch (platform) {
                    case BUNJANG -> bunjangProductPublishService.publish(currentMember.memberId(), productId);
                    case JOONGNA -> joongnaProductPublishService.publish(currentMember.memberId(), productId);
                };
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
                switch (platform) {
                    case BUNJANG -> bunjangProductLinkService.link(
                            currentMember.memberId(), productId, request.productUrl());
                    case JOONGNA -> joongnaProductLinkService.link(
                            currentMember.memberId(), productId, request.productUrl());
                };
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @Operation(summary = "연동된 플랫폼 매물의 판매 상태 동기화")
    @PatchMapping("/products/{productId}/platforms/{platform}/sync")
    public ResponseEntity<ApiResponse<ProductPlatformResponse>> syncStatus(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable Long productId,
            @PathVariable PlatformType platform) {
        ProductPlatformResponse response =
                switch (platform) {
                    case BUNJANG -> bunjangProductLinkService.syncStatus(currentMember.memberId(), productId);
                    case JOONGNA -> joongnaProductLinkService.syncStatus(currentMember.memberId(), productId);
                };
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "플랫폼에 게시한 매물 삭제")
    @DeleteMapping("/products/{productId}/platforms/{platform}")
    public ResponseEntity<ApiResponse<ProductPlatformResponse>> removeListing(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable Long productId,
            @PathVariable PlatformType platform) {
        if (platform != PlatformType.JOONGNA) {
            throw new UnsupportedPlatformException(platform.name());
        }
        ProductPlatformResponse response = joongnaProductLinkService.remove(currentMember.memberId(), productId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // 플랫폼별 연동 서비스 선택 — 새 플랫폼 추가 시 컴파일러가 누락된 case를 알려준다
    private BunjangConnectionResponse statusOf(PlatformType platform, Long memberId) {
        return switch (platform) {
            case BUNJANG -> bunjangConnectionService.getStatus(memberId);
            case JOONGNA -> joongnaConnectionService.getStatus(memberId);
        };
    }

    private static void requireBunjang(PlatformType platform) {
        if (platform != PlatformType.BUNJANG) {
            throw new UnsupportedPlatformException(platform.name());
        }
    }
}
