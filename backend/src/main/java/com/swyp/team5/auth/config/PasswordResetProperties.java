package com.swyp.team5.auth.config;

import java.time.Duration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "password-reset")
public record PasswordResetProperties(
        @NotNull Duration tokenExpires, @NotNull Duration cooldown, @NotBlank String resetUrl, @NotBlank String from) {}
