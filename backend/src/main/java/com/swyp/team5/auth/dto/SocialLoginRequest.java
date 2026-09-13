package com.swyp.team5.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import com.swyp.team5.social.entity.SocialProvider;

public record SocialLoginRequest(@NotNull SocialProvider provider, @NotBlank String token) {}
