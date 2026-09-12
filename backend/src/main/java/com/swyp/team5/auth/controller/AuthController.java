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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.swyp.team5.auth.dto.AuthResult;
import com.swyp.team5.auth.dto.LoginRequest;
import com.swyp.team5.auth.dto.LoginResponse;
import com.swyp.team5.auth.dto.SignUpRequest;
import com.swyp.team5.auth.dto.SignUpResponse;
import com.swyp.team5.auth.dto.SocialLoginRequest;
import com.swyp.team5.auth.dto.TokenResponse;
import com.swyp.team5.auth.error.UnsupportedSocialProviderException;
import com.swyp.team5.auth.service.AuthService;
import com.swyp.team5.common.passport.JwtProperties;
import com.swyp.team5.common.passport.PrincipalMember;
import com.swyp.team5.member.entity.SocialProvider;
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

    private final JwtProperties jwtProperties;

    @Operation(summary = "회원가입")
    @PostMapping("/signup")
    public ResponseEntity<SignUpResponse> signUp(@Valid @RequestBody SignUpRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.signUp(request));
    }

    @Operation(summary = "로그인")
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResult tokens = authService.login(request);
        return responseWithRefreshTokenCookie(tokens, LoginResponse::new);
    }

    @Operation(summary = "소셜 로그인")
    @PostMapping("/social/{provider}")
    public ResponseEntity<TokenResponse> loginWithSocial(
            @PathVariable String provider, @Valid @RequestBody SocialLoginRequest request) {
        AuthResult tokens = authService.loginWithSocial(resolveProvider(provider), request);
        return responseWithRefreshTokenCookie(tokens, TokenResponse::new);
    }

    private SocialProvider resolveProvider(String provider) {
        try {
            return SocialProvider.valueOf(provider.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new UnsupportedSocialProviderException(provider);
        }
    }

    @Operation(summary = "토큰 재발급")
    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(
            @CookieValue(value = REFRESH_TOKEN_COOKIE, required = false) String refreshToken) {
        AuthResult tokens = authService.refresh(refreshToken);
        return responseWithRefreshTokenCookie(tokens, TokenResponse::new);
    }

    @Operation(summary = "로그아웃")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal PrincipalMember principal) {
        authService.logout(principal.memberId());
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, expiredRefreshTokenCookie().toString())
                .build();
    }

    private <T> ResponseEntity<T> responseWithRefreshTokenCookie(
            AuthResult tokens, Function<String, T> responseFactory) {
        return ResponseEntity.ok()
                .header(
                        HttpHeaders.SET_COOKIE,
                        refreshTokenCookie(tokens.refreshToken()).toString())
                .body(responseFactory.apply(tokens.accessToken()));
    }

    private ResponseCookie refreshTokenCookie(String refreshToken) {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, refreshToken)
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path(REFRESH_TOKEN_COOKIE_PATH)
                .maxAge(jwtProperties.refreshTokenExpires())
                .build();
    }

    private ResponseCookie expiredRefreshTokenCookie() {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path(REFRESH_TOKEN_COOKIE_PATH)
                .maxAge(0)
                .build();
    }
}
