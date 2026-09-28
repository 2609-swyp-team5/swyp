package com.swyp.team5.common.passport;

import java.io.IOException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import com.swyp.team5.common.common.ApiError;
import com.swyp.team5.common.common.ApiResponse;
import tools.jackson.databind.ObjectMapper;

/**
 * 인증은 됐지만 권한이 없는 요청(예: USER가 {@code /admin/**} 호출)에 ApiResponse 형식으로 403을 반환한다.
 * 등록하지 않으면 Spring Security 기본 403이 나가 응답 형식이 다른 API와 달라진다.
 */
@Component
@RequiredArgsConstructor
public class JsonAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException e)
            throws IOException {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        ApiResponse<Void> body = ApiResponse.error("접근 권한이 없습니다.", ApiError.of(HttpStatus.FORBIDDEN, "FORBIDDEN"));
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
