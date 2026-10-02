package com.swyp.team5.platform.bunjang.dto;

import jakarta.validation.constraints.NotBlank;

public record BunjangConnectRequest(
        @NotBlank(message = "번개장터 쿠키를 입력해 주세요.") String cookie) {} // 브라우저에서 복사한 쿠키 문자열(bun_session 포함)
