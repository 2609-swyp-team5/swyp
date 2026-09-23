package com.swyp.team5.platform.bunjang.controller;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.springframework.format.support.DefaultFormattingConversionService;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.swyp.team5.common.config.WebConfig;
import com.swyp.team5.common.error.GlobalExceptionHandler;
import com.swyp.team5.common.passport.PrincipalMember;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.platform.bunjang.dto.BunjangConnectionResponse;
import com.swyp.team5.platform.bunjang.service.BunjangConnectionService;
import com.swyp.team5.platform.bunjang.service.BunjangProductLinkService;
import com.swyp.team5.platform.bunjang.service.BunjangProductPublishService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 플랫폼 경로 변수({platform}) 바인딩 테스트 - 서비스는 Mock, 실제 컨버터/예외 핸들러 사용.
@ExtendWith(MockitoExtension.class)
class BunjangControllerTest {

    @Mock
    private BunjangConnectionService bunjangConnectionService;

    @Mock
    private BunjangProductLinkService bunjangProductLinkService;

    @Mock
    private BunjangProductPublishService bunjangProductPublishService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        DefaultFormattingConversionService conversionService = new DefaultFormattingConversionService();
        new WebConfig().addFormatters(conversionService);
        mockMvc = MockMvcBuilders.standaloneSetup(new BunjangController(
                        bunjangConnectionService, bunjangProductLinkService, bunjangProductPublishService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setConversionService(conversionService)
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken(
                        new PrincipalMember(2L, MemberRole.USER), null, List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // 소문자/대문자 모두 번개장터로 인식
    @Test
    void acceptsPlatformCaseInsensitively() throws Exception {
        when(bunjangConnectionService.getStatus(2L)).thenReturn(BunjangConnectionResponse.disconnected());

        mockMvc.perform(get("/platforms/bunjang")).andExpect(status().isOk());
        mockMvc.perform(get("/platforms/BUNJANG")).andExpect(status().isOk());
    }

    // 지원하지 않는 플랫폼이면 서비스 호출 없이 400(500이 아님)
    @Test
    void rejectsUnsupportedPlatformWith400() throws Exception {
        mockMvc.perform(get("/platforms/karrot"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT_VALUE"))
                .andExpect(jsonPath("$.error.details[0].field").value("platform"))
                .andExpect(jsonPath("$.error.details[0].content").value("지원하지 않는 플랫폼입니다: karrot"));

        verify(bunjangConnectionService, never()).getStatus(2L);
    }
}
