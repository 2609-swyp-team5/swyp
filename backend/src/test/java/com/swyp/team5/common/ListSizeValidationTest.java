package com.swyp.team5.common;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import com.swyp.team5.common.passport.JwtTokenProvider;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.notification.entity.Notification;
import com.swyp.team5.notification.entity.NotificationType;
import com.swyp.team5.notification.repository.NotificationRepository;
import com.swyp.team5.support.IntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

// 커서 목록 API의 size는 1~100만 받는다(0이면 다음 페이지 계산이 깨져 500, 상한이 없으면 한 번에 무제한 조회) — 벗어나면 400
class ListSizeValidationTest extends IntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String token;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        memberRepository.deleteAll();
        Member member = memberRepository.save(
                Member.ofLocalSignUp("list-size@example.com", null, "encoded-password", "회원", "member", null));
        // 데이터가 있어야 size=0일 때 다음 페이지 계산(content.get(-1))까지 간다
        notificationRepository.save(Notification.create(member, null, NotificationType.NOTICE, "알림", "내용"));
        token = jwtTokenProvider.createAccessToken(member.getId(), MemberRole.USER);
    }

    @ParameterizedTest
    @CsvSource({
        "/notifications, 0",
        "/notifications, 101",
        "/interests, 0",
        "/interests, -1",
        "/products/me, 0",
        "/products/me, 101"
    })
    void rejectsSizeOutsideRange(String path, String size) throws Exception {
        mockMvc.perform(get(path).param("size", size).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT_VALUE"));
    }

    @ParameterizedTest
    @CsvSource({"/notifications, 1", "/notifications, 100", "/interests, 20", "/products/me, 20"})
    void acceptsSizeWithinRange(String path, String size) throws Exception {
        mockMvc.perform(get(path).param("size", size).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());
    }
}
