package com.swyp.team5.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PasswordResetConfirmRequest(
        @NotBlank String resetToken,
        @NotBlank @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,64}$", message = "비밀번호는 영문과 숫자를 포함해 8자 이상으로 입력해 주세요.")
                String newPassword) {}
