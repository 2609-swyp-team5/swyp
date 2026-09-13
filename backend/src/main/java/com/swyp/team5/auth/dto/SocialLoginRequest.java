package com.swyp.team5.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record SocialLoginRequest(@NotBlank String token) {}
