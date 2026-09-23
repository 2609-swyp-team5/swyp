package com.swyp.team5.platform.bunjang.dto;

import jakarta.validation.constraints.NotBlank;

public record ProductPlatformLinkRequest(
        @NotBlank(message = "productUrl은 필수입니다.") String productUrl) {} // 이미 등록된 번개장터 매물 주소
