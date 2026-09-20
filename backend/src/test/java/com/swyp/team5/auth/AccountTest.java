package com.swyp.team5.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swyp.team5.auth.dto.SignUpRequest;
import com.swyp.team5.auth.service.RefreshTokenService;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.social.repository.SocialRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** 계정 확인/찾기 API 통합 테스트. */
@SpringBootTest
@AutoConfigureMockMvc
class AccountTest {

    private static final String CHECK_URL = "/auth/email/check";
    private static final String TAKEN_EMAIL = "taken@example.com";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private SocialRepository socialRepository;

    @MockitoBean
    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        socialRepository.deleteAll();
        memberRepository.deleteAll();
    }

    // 가입되지 않은 이메일은 사용 가능
    @Test
    void emailIsAvailableWhenNotTaken() throws Exception {
        mockMvc.perform(get(CHECK_URL).param("email", "new@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.available").value(true));
    }

    // 이미 가입된 이메일은 사용 불가
    @Test
    void emailIsUnavailableWhenTaken() throws Exception {
        signUp(TAKEN_EMAIL);

        mockMvc.perform(get(CHECK_URL).param("email", TAKEN_EMAIL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.available").value(false));
    }

    // 로그인 전에 쓰는 API 이므로 토큰 없이 호출할 수 있어야 한다
    @Test
    void emailCheckDoesNotRequireAuthentication() throws Exception {
        mockMvc.perform(get(CHECK_URL).param("email", "new@example.com")).andExpect(status().isOk());
    }

    /**
     * 이메일 형식이 아니면 400.
     *
     * <p>쿼리 파라미터를 객체(@ModelAttribute)로 받아 MethodArgumentNotValidException 경로를 타게 했다.
     * {@code @RequestParam @Email} 로 직접 검증하면 ConstraintViolationException 이 발생하는데 핸들러가 없어 500 이 나간다.
     * 그래서 상태 코드뿐 아니라 details 형식까지 확인한다.
     */
    @Test
    void emailCheckFailsWhenFormatInvalid() throws Exception {
        mockMvc.perform(get(CHECK_URL).param("email", "not-an-email"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT_VALUE"))
                .andExpect(jsonPath("$.error.details[0].field").value("email"));
    }

    // email 파라미터를 아예 빼도 400
    @Test
    void emailCheckFailsWhenParameterMissing() throws Exception {
        mockMvc.perform(get(CHECK_URL)).andExpect(status().isBadRequest());
    }

    // 빈 문자열도 400
    @Test
    void emailCheckFailsWhenBlank() throws Exception {
        mockMvc.perform(get(CHECK_URL).param("email", " ")).andExpect(status().isBadRequest());
    }

    private void signUp(String email) throws Exception {
        SignUpRequest request = new SignUpRequest(email, null, "password1234", "홍길동", "gildong");
        mockMvc.perform(post("/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }
}
