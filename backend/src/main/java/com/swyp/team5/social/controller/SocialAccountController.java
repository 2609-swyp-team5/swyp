package com.swyp.team5.social.controller;

import java.util.List;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.common.passport.PrincipalMember;
import com.swyp.team5.social.dto.SocialAccountResponse;
import com.swyp.team5.social.dto.SocialLinkRequest;
import com.swyp.team5.social.entity.SocialProvider;
import com.swyp.team5.social.service.SocialAccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Social", description = "소셜 계정 연동")
@RestController
@RequestMapping("/users/social")
@RequiredArgsConstructor
public class SocialAccountController {

    private final SocialAccountService socialAccountService;

    @Operation(summary = "소셜 연동 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<List<SocialAccountResponse>>> getSocialAccounts(
            @AuthenticationPrincipal PrincipalMember currentMember) {
        return ResponseEntity.ok(ApiResponse.success(socialAccountService.getSocialAccounts(currentMember.memberId())));
    }

    /**
     * 로그인한 회원에게 소셜 계정을 연동한다. {@code token}은 소셜 로그인과 같은 값(구글 ID 토큰, 카카오·네이버 인가 코드)이다.
     *
     * @param provider 소셜 제공자(대소문자 무관)
     * @return 200 OK + 연동된 소셜 계정
     */
    @Operation(summary = "소셜 계정 연동")
    @PostMapping("/{provider}")
    public ResponseEntity<ApiResponse<SocialAccountResponse>> link(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable SocialProvider provider,
            @Valid @RequestBody SocialLinkRequest request) {
        return ResponseEntity.ok(
                ApiResponse.success(socialAccountService.link(currentMember.memberId(), provider, request.token())));
    }

    @Operation(summary = "소셜 연동 해제")
    @DeleteMapping("/{provider}")
    public ResponseEntity<ApiResponse<Void>> unlink(
            @AuthenticationPrincipal PrincipalMember currentMember, @PathVariable SocialProvider provider) {
        socialAccountService.unlink(currentMember.memberId(), provider);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
