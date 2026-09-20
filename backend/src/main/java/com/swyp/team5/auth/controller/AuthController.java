package com.swyp.team5.auth.controller;

import java.util.function.Function;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.swyp.team5.auth.dto.AuthResult;
import com.swyp.team5.auth.dto.EmailAvailabilityResponse;
import com.swyp.team5.auth.dto.EmailCheckRequest;
import com.swyp.team5.auth.dto.LoginRequest;
import com.swyp.team5.auth.dto.LoginResponse;
import com.swyp.team5.auth.dto.PasswordResetConfirmRequest;
import com.swyp.team5.auth.dto.PasswordResetRequest;
import com.swyp.team5.auth.dto.SignUpRequest;
import com.swyp.team5.auth.dto.SignUpResponse;
import com.swyp.team5.auth.dto.SocialLoginRequest;
import com.swyp.team5.auth.dto.TokenResponse;
import com.swyp.team5.auth.service.AuthService;
import com.swyp.team5.auth.service.PasswordResetService;
import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.common.passport.JwtProperties;
import com.swyp.team5.common.passport.PrincipalMember;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Auth", description = "인증/인가")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";
    private static final String REFRESH_TOKEN_COOKIE_PATH = "/auth";

    private final AuthService authService;

    private final PasswordResetService passwordResetService;

    private final JwtProperties jwtProperties;

    @Operation(summary = "회원가입")
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<SignUpResponse>> signUp(@Valid @RequestBody SignUpRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(authService.signUp(request)));
    }

    @Operation(summary = "로그인")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResult tokens = authService.login(request);
        return responseWithRefreshTokenCookie(tokens, LoginResponse::new);
    }

    @Operation(summary = "소셜 로그인")
    @PostMapping("/social/login")
    public ResponseEntity<ApiResponse<TokenResponse>> loginWithSocial(@Valid @RequestBody SocialLoginRequest request) {
        AuthResult tokens = authService.loginWithSocial(request);
        return responseWithRefreshTokenCookie(tokens, TokenResponse::new);
    }

    @Operation(summary = "토큰 재발급")
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(
            @CookieValue(value = REFRESH_TOKEN_COOKIE, required = false) String refreshToken) {
        AuthResult tokens = authService.refresh(refreshToken);
        return responseWithRefreshTokenCookie(tokens, TokenResponse::new);
    }

    @Operation(summary = "로그아웃")
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@AuthenticationPrincipal PrincipalMember currentMember) {
        authService.logout(currentMember.memberId());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, expiredRefreshTokenCookie().toString())
                .body(ApiResponse.<Void>success("성공적으로 로그아웃되었습니다.", null));
    }

    @Operation(summary = "이메일 중복확인")
    @GetMapping("/email/check")
    public ResponseEntity<ApiResponse<EmailAvailabilityResponse>> checkEmail(
            @Valid @ModelAttribute EmailCheckRequest request) {
        boolean available = authService.isEmailAvailable(request.email());
        return ResponseEntity.ok(ApiResponse.success(new EmailAvailabilityResponse(available)));
    }

    @Operation(summary = "비밀번호 재설정 요청")
    @PostMapping("/password/reset")
    public ResponseEntity<ApiResponse<Void>> requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        passwordResetService.requestReset(request.email());
        return ResponseEntity.ok(ApiResponse.success("비밀번호 재설정 메일을 발송했습니다.", null));
    }

    @Operation(summary = "비밀번호 재설정")
    @PatchMapping("/password/reset")
    public ResponseEntity<ApiResponse<Void>> confirmPasswordReset(
            @Valid @RequestBody PasswordResetConfirmRequest request) {
        passwordResetService.confirmReset(request.token(), request.newPassword());
        return ResponseEntity.ok(ApiResponse.success("비밀번호가 변경되었습니다.", null));
    }

    private <T> ResponseEntity<ApiResponse<T>> responseWithRefreshTokenCookie(
            AuthResult tokens, Function<String, T> responseFactory) {
        return ResponseEntity.ok()
                .header(
                        HttpHeaders.SET_COOKIE,
                        refreshTokenCookie(tokens.refreshToken()).toString())
                .body(ApiResponse.success(responseFactory.apply(tokens.accessToken())));
    }

    private ResponseCookie refreshTokenCookie(String refreshToken) {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, refreshToken)
                .httpOnly(true)
                .secure(jwtProperties.cookieSecure())
                .sameSite(jwtProperties.cookieSameSite())
                .path(REFRESH_TOKEN_COOKIE_PATH)
                .maxAge(jwtProperties.refreshTokenExpires())
                .build();
    }

    private ResponseCookie expiredRefreshTokenCookie() {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(jwtProperties.cookieSecure())
                .sameSite(jwtProperties.cookieSameSite())
                .path(REFRESH_TOKEN_COOKIE_PATH)
                .maxAge(0)
                .build();
    }
}
