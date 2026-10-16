package com.swyp.team5.file;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import com.swyp.team5.common.passport.JwtTokenProvider;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.support.IntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// 범용 파일 API(/files)는 파일 소유자를 확인하지 않으므로 관리자만 쓸 수 있다(일반 회원은 403, 키만으로 남의 이미지를 지우지 못하게)
class FileAccessTest extends IntegrationTest {

    private static final String KEY = "products/someone-else.png";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String userToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        memberRepository.deleteAll();
        Member user = memberRepository.save(
                Member.ofLocalSignUp("file-user@example.com", null, "encoded-password", "회원", "member", null));
        Member admin = memberRepository.save(
                Member.ofLocalSignUp("file-admin@example.com", null, "encoded-password", "관리자", "admin", null));
        userToken = jwtTokenProvider.createAccessToken(user.getId(), MemberRole.USER);
        adminToken = jwtTokenProvider.createAccessToken(admin.getId(), MemberRole.ADMIN);
    }

    @Test
    void memberCannotUseFileApi() throws Exception {
        mockMvc.perform(delete("/files").param("key", KEY).header(HttpHeaders.AUTHORIZATION, bearer(userToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/files/batch")
                        .header(HttpHeaders.AUTHORIZATION, bearer(userToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[\"" + KEY + "\"]"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/files/exists").param("key", KEY).header(HttpHeaders.AUTHORIZATION, bearer(userToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/files/presigned-url")
                        .param("key", KEY)
                        .header(HttpHeaders.AUTHORIZATION, bearer(userToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(multipart("/files")
                        .file(new MockMultipartFile("file[]", "a.png", "image/png", new byte[] {1}))
                        .header(HttpHeaders.AUTHORIZATION, bearer(userToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/files").param("key", KEY)).andExpect(status().isUnauthorized());

        verify(fileStorageService, never()).delete(anyString());
        verify(fileStorageService, never()).deleteAll(anyList());
    }

    @Test
    void adminCanStillUseFileApi() throws Exception {
        mockMvc.perform(delete("/files").param("key", KEY).header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk());

        verify(fileStorageService).delete(KEY);
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
