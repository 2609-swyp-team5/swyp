package com.swyp.team5.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;

import com.swyp.team5.auth.dto.AuthResult;
import com.swyp.team5.auth.dto.LoginRequest;
import com.swyp.team5.auth.dto.SignUpRequest;
import com.swyp.team5.auth.dto.SignUpResponse;
import com.swyp.team5.auth.dto.SocialLoginRequest;
import com.swyp.team5.auth.dto.SocialUserInfo;
import com.swyp.team5.auth.error.DuplicateEmailException;
import com.swyp.team5.auth.error.DuplicatePhoneException;
import com.swyp.team5.auth.error.InvalidCredentialsException;
import com.swyp.team5.auth.error.InvalidSocialTokenException;
import com.swyp.team5.auth.error.InvalidTokenException;
import com.swyp.team5.auth.error.UnsupportedSocialProviderException;
import com.swyp.team5.common.passport.JwtTokenProvider;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.social.entity.Social;
import com.swyp.team5.social.entity.SocialProvider;
import com.swyp.team5.social.repository.SocialRepository;
import com.swyp.team5.social.strategy.SocialLoginStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 인증/인가 관련 단위 Service 테스트.
 * AuthService의 핵심 로직을 검증한다.
 * 외부 인프라(Redis, 구글 ID 토큰 검증)는 Mockito로 대체한다.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String DEFAULT_PROFILE_IMAGE_URL = "https://placehold.co/200x200?text=Profile";

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private SocialRepository socialRepository;

    @Mock
    private SocialLoginStrategy googleLoginStrategy;

    private AuthService authService;

    @BeforeEach
    void setUp() throws Exception {
        when(googleLoginStrategy.provider()).thenReturn(SocialProvider.GOOGLE);
        authService = new AuthService(
                memberRepository,
                socialRepository,
                passwordEncoder,
                jwtTokenProvider,
                refreshTokenService,
                List.of(googleLoginStrategy));

        Field field = AuthService.class.getDeclaredField("defaultProfileImageUrl");
        field.setAccessible(true);
        field.set(authService, DEFAULT_PROFILE_IMAGE_URL);
    }

    // 회원가입 성공
    @Test
    void signUpSucceeds() {
        SignUpRequest request = new SignUpRequest("test@example.com", "01012345678", "password1234", "홍길동", "gildong");
        when(memberRepository.existsByEmail(request.email())).thenReturn(false);
        when(memberRepository.existsByPhone(request.phone())).thenReturn(false);
        when(passwordEncoder.encode(request.password())).thenReturn("encoded-password");
        when(memberRepository.save(any(Member.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SignUpResponse response = authService.signUp(request);

        assertThat(response.email()).isEqualTo(request.email());
        assertThat(response.nickname()).isEqualTo(request.nickname());
    }

    // 회원가입 실패 - 이메일 중복
    @Test
    void signUpFailsWhenEmailDuplicated() {
        SignUpRequest request = new SignUpRequest("test@example.com", "01012345678", "password1234", "홍길동", "gildong");
        when(memberRepository.existsByEmail(request.email())).thenReturn(true);

        assertThatThrownBy(() -> authService.signUp(request)).isInstanceOf(DuplicateEmailException.class);
    }

    // 회원가입 실패 - 휴대폰 번호 중복
    @Test
    void signUpFailsWhenPhoneDuplicated() {
        SignUpRequest request = new SignUpRequest("test@example.com", "01012345678", "password1234", "홍길동", "gildong");
        when(memberRepository.existsByEmail(request.email())).thenReturn(false);
        when(memberRepository.existsByPhone(request.phone())).thenReturn(true);

        assertThatThrownBy(() -> authService.signUp(request)).isInstanceOf(DuplicatePhoneException.class);
    }

    // 로그인 성공
    @Test
    void loginSucceeds() {
        LoginRequest request = new LoginRequest("test@example.com", "password1234");
        Member member = Member.ofLocalSignUp(
                request.email(), "01012345678", "encoded-password", "홍길동", "gildong", DEFAULT_PROFILE_IMAGE_URL);
        setId(member, 1L);

        when(memberRepository.findByEmail(request.email())).thenReturn(Optional.of(member));
        when(passwordEncoder.matches(request.password(), member.getPassword())).thenReturn(true);
        when(jwtTokenProvider.createAccessToken(member.getId(), member.getRole()))
                .thenReturn("access-token");
        when(jwtTokenProvider.createRefreshToken(member.getId())).thenReturn("refresh-token");

        AuthResult tokens = authService.login(request);

        assertThat(tokens.accessToken()).isEqualTo("access-token");
        assertThat(tokens.refreshToken()).isEqualTo("refresh-token");
    }

    // 로그인 실패 - 존재하지 않는 이메일
    @Test
    void loginFailsWhenEmailNotFound() {
        LoginRequest request = new LoginRequest("unknown@example.com", "password1234");
        when(memberRepository.findByEmail(request.email())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request)).isInstanceOf(InvalidCredentialsException.class);
    }

    // 로그인 실패 - 비밀번호 불일치
    @Test
    void loginFailsWhenPasswordMismatches() {
        LoginRequest request = new LoginRequest("test@example.com", "wrong-password");
        Member member = Member.ofLocalSignUp(
                request.email(), "01012345678", "encoded-password", "홍길동", "gildong", DEFAULT_PROFILE_IMAGE_URL);

        when(memberRepository.findByEmail(request.email())).thenReturn(Optional.of(member));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request)).isInstanceOf(InvalidCredentialsException.class);
    }

    // 토큰 재발급 실패 - 유효하지 않은 리프레시 토큰
    @Test
    void refreshTokenFailsWhenRefreshTokenInvalid() {
        when(jwtTokenProvider.isValidRefreshToken("invalid-token")).thenReturn(false);

        assertThatThrownBy(() -> authService.refresh("invalid-token")).isInstanceOf(InvalidTokenException.class);
    }

    // 토큰 재발급 실패 - 저장된 토큰과 불일치
    @Test
    void refreshTokenFailsWhenStoredTokenMismatches() {
        String refreshToken = "refresh-token";
        when(jwtTokenProvider.isValidRefreshToken(refreshToken)).thenReturn(true);
        when(jwtTokenProvider.getMemberIdFromRefreshToken(refreshToken)).thenReturn(1L);
        when(refreshTokenService.matches(1L, refreshToken)).thenReturn(false);

        assertThatThrownBy(() -> authService.refresh(refreshToken)).isInstanceOf(InvalidTokenException.class);
    }

    // 소셜 로그인 성공 - 기존 연결된 계정
    @Test
    void socialLoginSucceedsWithExistingLinkedAccount() {
        SocialLoginRequest request = new SocialLoginRequest(SocialProvider.GOOGLE, "id-token");
        SocialUserInfo userInfo = new SocialUserInfo("google-sub-1", "test@example.com", "홍길동", null);
        Member member = Member.ofSocialSignUp(userInfo.email(), userInfo.name(), userInfo.name(), null);
        setId(member, 1L);
        Social social = Social.of(SocialProvider.GOOGLE, userInfo.providerId(), member);

        when(googleLoginStrategy.verify(request.token())).thenReturn(userInfo);
        when(socialRepository.findByProviderAndProviderId(SocialProvider.GOOGLE, userInfo.providerId()))
                .thenReturn(Optional.of(social));
        when(jwtTokenProvider.createAccessToken(member.getId(), member.getRole()))
                .thenReturn("access-token");
        when(jwtTokenProvider.createRefreshToken(member.getId())).thenReturn("refresh-token");

        AuthResult tokens = authService.loginWithSocial(SocialProvider.GOOGLE, request);

        assertThat(tokens.accessToken()).isEqualTo("access-token");
    }

    // 소셜 로그인 성공 - 최초 로그인, 기존 이메일 계정에 연동
    @Test
    void socialLoginSucceedsWithFirstLoginLinkedToExistingEmailAccount() {
        SocialLoginRequest request = new SocialLoginRequest(SocialProvider.GOOGLE, "id-token");
        SocialUserInfo userInfo = new SocialUserInfo("google-sub-2", "test@example.com", "홍길동", null);
        Member existingMember = Member.ofLocalSignUp(
                userInfo.email(), "01012345678", "encoded-password", "홍길동", "gildong", DEFAULT_PROFILE_IMAGE_URL);
        setId(existingMember, 2L);

        when(googleLoginStrategy.verify(request.token())).thenReturn(userInfo);
        when(socialRepository.findByProviderAndProviderId(SocialProvider.GOOGLE, userInfo.providerId()))
                .thenReturn(Optional.empty());
        when(memberRepository.findByEmail(userInfo.email())).thenReturn(Optional.of(existingMember));
        when(jwtTokenProvider.createAccessToken(existingMember.getId(), existingMember.getRole()))
                .thenReturn("access-token");
        when(jwtTokenProvider.createRefreshToken(existingMember.getId())).thenReturn("refresh-token");

        AuthResult tokens = authService.loginWithSocial(SocialProvider.GOOGLE, request);

        assertThat(tokens.accessToken()).isEqualTo("access-token");
        verify(socialRepository).save(any(Social.class));
        verify(memberRepository, never()).save(any(Member.class));
    }

    // 소셜 로그인 성공 - 최초 로그인, 신규 회원가입
    @Test
    void socialLoginSucceedsWithFirstLoginNewSignUp() {
        SocialLoginRequest request = new SocialLoginRequest(SocialProvider.GOOGLE, "id-token");
        SocialUserInfo userInfo = new SocialUserInfo("google-sub-3", "new@example.com", "새싹", "https://picture");

        when(googleLoginStrategy.verify(request.token())).thenReturn(userInfo);
        when(socialRepository.findByProviderAndProviderId(SocialProvider.GOOGLE, userInfo.providerId()))
                .thenReturn(Optional.empty());
        when(memberRepository.findByEmail(userInfo.email())).thenReturn(Optional.empty());
        when(memberRepository.save(any(Member.class))).thenAnswer(invocation -> {
            Member saved = invocation.getArgument(0);
            setId(saved, 3L);
            return saved;
        });
        when(jwtTokenProvider.createAccessToken(eq(3L), any())).thenReturn("access-token");
        when(jwtTokenProvider.createRefreshToken(3L)).thenReturn("refresh-token");

        AuthResult tokens = authService.loginWithSocial(SocialProvider.GOOGLE, request);

        assertThat(tokens.accessToken()).isEqualTo("access-token");
        verify(memberRepository).save(any(Member.class));
        verify(socialRepository).save(any(Social.class));
    }

    // 소셜 로그인 실패 - 유효하지 않은 토큰
    @Test
    void socialLoginFailsWhenTokenInvalid() {
        SocialLoginRequest request = new SocialLoginRequest(SocialProvider.GOOGLE, "invalid-id-token");
        when(googleLoginStrategy.verify(request.token())).thenThrow(new InvalidSocialTokenException("invalid"));

        assertThatThrownBy(() -> authService.loginWithSocial(SocialProvider.GOOGLE, request))
                .isInstanceOf(InvalidSocialTokenException.class);
    }

    // 소셜 로그인 실패 - 지원하지 않는 provider
    @Test
    void socialLoginFailsWhenProviderUnsupported() {
        SocialLoginRequest request = new SocialLoginRequest(SocialProvider.NAVER, "id-token");

        assertThatThrownBy(() -> authService.loginWithSocial(SocialProvider.NAVER, request))
                .isInstanceOf(UnsupportedSocialProviderException.class);
    }

    private void setId(Member member, Long id) {
        try {
            Field field = Member.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(member, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
