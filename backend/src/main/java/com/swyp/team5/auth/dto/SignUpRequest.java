package com.swyp.team5.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignUpRequest(
        @NotBlank @Email String email,
        @Pattern(regexp = "^01[016789]\\d{7,8}$", message = "휴대폰 번호 형식이 올바르지 않아요.") String phone,
        @NotBlank @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,64}$", message = "비밀번호는 영문과 숫자를 포함해 8자 이상으로 입력해 주세요.")
                String password,
        @NotBlank @Size(max = 50) String name,
        @NotBlank @Size(max = 30) String nickname) {}
