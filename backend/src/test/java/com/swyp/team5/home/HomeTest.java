package com.swyp.team5.home;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

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
import org.junit.jupiter.api.Test;

// 홈 요약 API 통합 테스트 - 인증 필요, 오늘 받은 추천 알림만 셈(공지 제외).
class HomeTest extends IntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Test
    void getSummaryCountsTodayRecommendationAlerts() throws Exception {
        Member member = memberRepository.save(Member.ofLocalSignUp(
                "home-" + UUID.randomUUID() + "@example.com", null, "encoded-password", "회원", "home", null));
        String token = jwtTokenProvider.createAccessToken(member.getId(), MemberRole.USER);
        notificationRepository.save(Notification.create(member, null, NotificationType.SELL, "판매 추천", "내용"));
        notificationRepository.save(Notification.create(member, null, NotificationType.NOTICE, "공지", "내용"));

        mockMvc.perform(get("/home/summary").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.productCount").value(0))
                .andExpect(jsonPath("$.data.productStatusCounts.ON_SALE").value(0))
                .andExpect(jsonPath("$.data.interestCount").value(0))
                .andExpect(jsonPath("$.data.todayRecommendationCount").value(1))
                .andExpect(jsonPath("$.data.marketPriceDiffRate").doesNotExist())
                .andExpect(jsonPath("$.data.lastAnalyzedAt").doesNotExist());

        mockMvc.perform(get("/home/summary")).andExpect(status().isUnauthorized());
    }
}
