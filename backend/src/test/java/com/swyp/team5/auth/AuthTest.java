package com.swyp.team5.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultMatcher;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swyp.team5.auth.dto.LoginRequest;
import com.swyp.team5.auth.dto.SignUpRequest;
import com.swyp.team5.auth.dto.SocialLoginRequest;
import com.swyp.team5.auth.dto.SocialUserInfo;
import com.swyp.team5.auth.service.RefreshTokenService;
import com.swyp.team5.common.passport.JwtTokenProvider;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.social.repository.SocialRepository;
import com.swyp.team5.social.strategy.SocialLoginStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

/**
 * 인증/인가 관련 통합 테스트.
 * 컨트롤러~서비스~레포지토리 전체 흐름을 검증한다.
 * 외부 인프라(Redis, 구글 ID 토큰 검증)는 MockitoBean으로 대체한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthTest {

    private static final String DEFAULT_EMAIL = "test@example.com";
    private static final String DEFAULT_PASSWORD = "password1234";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private SocialRepository socialRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private RefreshTokenService refreshTokenService;

    // AuthService가 생성 시점(싱글톤 초기화)에 provider()를 한 번 호출해 맵을 구성하므로,
    // @BeforeEach에서 provider()를 스텁하는 MockitoBean 방식으로는 그 시점을 맞출 수 없다.
    // 실제 provider()(GOOGLE 고정값)는 그대로 두고 verify()만 스텁하도록 스파이를 사용한다.
    @MockitoSpyBean
    private SocialLoginStrategy googleLoginStrategy;

    @BeforeEach
    void setUp() {
        socialRepository.deleteAll();
        memberRepository.deleteAll();
    }

    // 회원가입 성공
    @Test
    void signUpSucceeds() throws Exception {
        SignUpRequest request = new SignUpRequest(DEFAULT_EMAIL, "01012345678", DEFAULT_PASSWORD, "홍길동", "gildong");

        mockMvc.perform(post("/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(DEFAULT_EMAIL))
                .andExpect(jsonPath("$.nickname").value("gildong"));

        assertThat(memberRepository.existsByEmail(DEFAULT_EMAIL)).isTrue();
    }

    // 회원가입 실패 - 이메일 중복
    @Test
    void signUpFailsWhenEmailDuplicated() throws Exception {
        SignUpRequest request = new SignUpRequest(DEFAULT_EMAIL, "01012345678", DEFAULT_PASSWORD, "홍길동", "gildong");
        signUp(request);

        SignUpRequest duplicateEmailRequest =
                new SignUpRequest(DEFAULT_EMAIL, "01099998888", DEFAULT_PASSWORD, "김철수", "chulsoo");

        mockMvc.perform(post("/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateEmailRequest)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    // 회원가입 실패 - 요청값 검증 실패
    @Test
    void signUpFailsWhenRequestInvalid() throws Exception {
        SignUpRequest invalidRequest = new SignUpRequest("invalid-email", "01012345678", "short", "홍길동", "gildong");

        mockMvc.perform(post("/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    // 로그인 성공
    @Test
    void loginSucceeds() throws Exception {
        signUp(new SignUpRequest(DEFAULT_EMAIL, "01012345678", DEFAULT_PASSWORD, "홍길동", "gildong"));
        LoginRequest request = new LoginRequest(DEFAULT_EMAIL, DEFAULT_PASSWORD);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(cookieHeaderContains("refreshToken="));
    }

    // 로그인 실패 - 비밀번호 불일치
    @Test
    void loginFailsWhenPasswordMismatches() throws Exception {
        signUp(new SignUpRequest(DEFAULT_EMAIL, "01012345678", DEFAULT_PASSWORD, "홍길동", "gildong"));
        LoginRequest request = new LoginRequest(DEFAULT_EMAIL, "wrong-password");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    // 토큰 재발급 성공
    @Test
    void refreshTokenSucceeds() throws Exception {
        Long memberId = signUp(new SignUpRequest(DEFAULT_EMAIL, "01012345678", DEFAULT_PASSWORD, "홍길동", "gildong"));
        String refreshToken = jwtTokenProvider.createRefreshToken(memberId);
        when(refreshTokenService.matches(memberId, refreshToken)).thenReturn(true);

        mockMvc.perform(post("/auth/refresh").cookie(new Cookie("refreshToken", refreshToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    // 토큰 재발급 실패 - 유효하지 않은 토큰
    @Test
    void refreshTokenFailsWhenTokenInvalid() throws Exception {
        mockMvc.perform(post("/auth/refresh").cookie(new Cookie("refreshToken", "invalid-token")))
                .andExpect(status().isUnauthorized());
    }

    // 소셜 로그인 성공 - 신규 회원가입
    @Test
    void socialLoginSucceedsWithNewSignUp() throws Exception {
        SocialUserInfo userInfo = new SocialUserInfo("google-sub-1", "social@example.com", "새싹", null);
        // 스파이의 실제 verify()는 구글 서버 통신이 필요해 when(...)으로 스텁하면 실제 메소드가 먼저 호출되어 버린다.
        // 실제 호출 없이 스텁만 걸리도록 doReturn().when(...) 형태를 사용한다.
        Mockito.doReturn(userInfo).when(googleLoginStrategy).verify("id-token");
        SocialLoginRequest request = new SocialLoginRequest("id-token");

        mockMvc.perform(post("/auth/social/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());

        assertThat(memberRepository.existsByEmail("social@example.com")).isTrue();
    }

    // 소셜 로그인 실패 - 지원하지 않는 provider
    @Test
    void socialLoginFailsWhenProviderUnsupported() throws Exception {
        SocialLoginRequest request = new SocialLoginRequest("id-token");

        mockMvc.perform(post("/auth/social/naver")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // 로그아웃 성공
    @Test
    void logoutSucceeds() throws Exception {
        Long memberId = signUp(new SignUpRequest(DEFAULT_EMAIL, "01012345678", DEFAULT_PASSWORD, "홍길동", "gildong"));
        String accessToken = jwtTokenProvider.createAccessToken(memberId, MemberRole.USER);

        mockMvc.perform(post("/auth/logout").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isNoContent());
    }

    private Long signUp(SignUpRequest request) throws Exception {
        mockMvc.perform(post("/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        return memberRepository.findByEmail(request.email()).orElseThrow().getId();
    }

    private ResultMatcher cookieHeaderContains(String expected) {
        return result -> assertThat(result.getResponse().getHeader(HttpHeaders.SET_COOKIE))
                .contains(expected);
    }
}
