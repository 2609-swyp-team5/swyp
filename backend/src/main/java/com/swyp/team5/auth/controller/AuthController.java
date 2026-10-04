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

/**
 * 인증 API. 로그인 계열(일반·소셜·재발급) 성공 시 Access Token은 응답 바디로, Refresh Token은 httpOnly 쿠키
 * ({@code refreshToken}, path {@code /auth})로 내려준다. 로그아웃을 제외한 모든 API는
 * 인증 없이 호출할 수 있다({@code SecurityConfig}의 permitAll 경로).
 */
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

    /**
     * 이메일·비밀번호로 회원가입한다(토큰은 발급하지 않으므로 이어서 로그인해야 함). 탈퇴한 회원의 이메일·전화번호는
     * 다시 사용할 수 있다.
     *
     * @param request 가입 정보(이메일, 비밀번호, 이름, 닉네임, 전화번호(선택))
     * @return 201 Created + 가입한 회원 정보. 이메일·전화번호가 이미 사용 중이면 409
     */
    @Operation(summary = "회원가입")
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<SignUpResponse>> signUp(@Valid @RequestBody SignUpRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(authService.signUp(request)));
    }

    /**
     * 이메일·비밀번호로 로그인한다.
     *
     * @param request 이메일, 비밀번호
     * @return 200 OK + Access Token(바디) + Refresh Token(쿠키). 이메일·비밀번호가 틀리거나 소셜 전용 계정이면 401,
     *     활성 상태가 아닌 회원이면 403
     */
    @Operation(summary = "로그인")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResult tokens = authService.login(request);
        return responseWithRefreshTokenCookie(tokens, LoginResponse::new);
    }

    /**
     * 소셜 로그인. provider별 전략이 토큰을 검증하고, 처음 로그인한 소셜 계정이면 같은 이메일의 기존 회원에 연결하거나
     * 새 회원으로 가입시킨다.
     *
     * @param request provider(GOOGLE/KAKAO/NAVER)와 provider가 발급한 토큰
     * @return 200 OK + Access Token(바디) + Refresh Token(쿠키). 지원하지 않는 provider면 400, 토큰 검증 실패면 401,
     *     활성 상태가 아닌 회원이면 403
     */
    @Operation(summary = "소셜 로그인")
    @PostMapping("/social/login")
    public ResponseEntity<ApiResponse<TokenResponse>> loginWithSocial(@Valid @RequestBody SocialLoginRequest request) {
        AuthResult tokens = authService.loginWithSocial(request);
        return responseWithRefreshTokenCookie(tokens, TokenResponse::new);
    }

    /**
     * Refresh Token 쿠키로 토큰을 재발급한다. 회원별 최신 Refresh Token 1개만 유효하므로 재발급하면 이전 Refresh
     * Token은 쓸 수 없다(다른 기기의 세션도 무효가 됨).
     *
     * @param refreshToken Refresh Token 쿠키 값(없으면 401)
     * @return 200 OK + 새 Access Token(바디) + 새 Refresh Token(쿠키). 쿠키가 없거나 만료·변조·교체된 토큰이면 401
     */
    @Operation(summary = "토큰 재발급")
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(
            @CookieValue(value = REFRESH_TOKEN_COOKIE, required = false) String refreshToken) {
        AuthResult tokens = authService.refresh(refreshToken);
        return responseWithRefreshTokenCookie(tokens, TokenResponse::new);
    }

    /**
     * 로그아웃한다. 인증(Access Token)이 필요한 유일한 인증 API이며, 서버에 저장된 Refresh Token을 삭제하고 쿠키를
     * 만료시킨다. Access Token은 블랙리스트가 없어 만료 시각까지는 유효하다.
     *
     * @param currentMember 인증된 요청자
     * @return 200 OK + 만료된 Refresh Token 쿠키
     */
    @Operation(summary = "로그아웃")
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@AuthenticationPrincipal PrincipalMember currentMember) {
        authService.logout(currentMember.memberId());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, expiredRefreshTokenCookie().toString())
                .body(ApiResponse.<Void>success("로그아웃되었습니다.", null));
    }

    /**
     * 가입 가능한 이메일인지 확인한다(탈퇴한 회원의 이메일은 사용 가능으로 본다).
     *
     * @param request 확인할 이메일(쿼리 파라미터)
     * @return 200 OK + 사용 가능 여부
     */
    @Operation(summary = "이메일 중복확인")
    @GetMapping("/email/check")
    public ResponseEntity<ApiResponse<EmailAvailabilityResponse>> checkEmail(
            @Valid @ModelAttribute EmailCheckRequest request) {
        boolean available = authService.isEmailAvailable(request.email());
        return ResponseEntity.ok(ApiResponse.success(new EmailAvailabilityResponse(available)));
    }

    /**
     * 비밀번호 재설정 메일을 요청한다. 가입 여부를 드러내지 않기 위해 없는 이메일·비활성 회원이어도 같은 성공 응답을
     * 주며, 소셜 전용 계정에는 재설정 대신 안내 메일을 보낸다. 같은 이메일로 짧은 시간 안에 다시 요청하면 메일을 보내지
     * 않는다.
     *
     * @param request 재설정할 계정 이메일
     * @return 200 OK(항상 같은 응답)
     */
    @Operation(summary = "비밀번호 재설정 요청")
    @PostMapping("/password/reset")
    public ResponseEntity<ApiResponse<Void>> requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        passwordResetService.requestReset(request.email());
        return ResponseEntity.ok(ApiResponse.success("비밀번호 재설정 메일을 발송했습니다.", null));
    }

    /**
     * 메일로 받은 재설정 토큰으로 비밀번호를 바꾼다. 성공하면 토큰은 폐기되고 저장된 Refresh Token도 삭제되어 다시
     * 로그인해야 한다.
     *
     * @param request 재설정 토큰, 새 비밀번호
     * @return 200 OK. 토큰이 없거나 만료됐거나 회원이 활성 상태가 아니면 401
     */
    @Operation(summary = "비밀번호 재설정")
    @PatchMapping("/password/reset")
    public ResponseEntity<ApiResponse<Void>> confirmPasswordReset(
            @Valid @RequestBody PasswordResetConfirmRequest request) {
        passwordResetService.confirmReset(request.resetToken(), request.newPassword());
        return ResponseEntity.ok(ApiResponse.success("비밀번호가 재설정되었습니다.", null));
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
