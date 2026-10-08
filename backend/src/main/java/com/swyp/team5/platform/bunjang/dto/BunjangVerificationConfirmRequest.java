package com.swyp.team5.platform.bunjang.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record BunjangVerificationConfirmRequest(
        @NotBlank @Pattern(regexp = "^\\d{6}$", message = "인증번호는 숫자 6자리로 입력해야 합니다.") String otp) {}
