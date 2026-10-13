package com.swyp.team5.platform.bunjang.dto;

import jakarta.validation.constraints.NotBlank;

public record ProductPlatformLinkRequest(
        @NotBlank(message = "매물 주소를 입력해 주세요.") String productUrl) {} // 이미 등록된 플랫폼 매물 주소
