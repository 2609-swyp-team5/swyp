package com.swyp.team5.platform.bunjang.dto;

import jakarta.validation.constraints.NotBlank;

public record BunjangConnectRequest(
        @NotBlank(message = "cookie는 필수입니다.") String cookie) {} // 브라우저에서 복사한 쿠키 문자열(bun_session 포함)
