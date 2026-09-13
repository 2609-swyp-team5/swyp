package com.swyp.team5.common.passport;

import java.io.IOException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import com.swyp.team5.common.common.ApiError;
import com.swyp.team5.common.common.ApiResponse;
import tools.jackson.databind.ObjectMapper;

/** 인증되지 않은 요청이 보호된 리소스에 접근할 때 다른 인증 실패와 ApiResponse 형식으로 401을 반환한다. */
@Component
@RequiredArgsConstructor
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(
            HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        ApiResponse<Void> body = ApiResponse.error("인증이 필요합니다.", ApiError.of(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED"));
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
