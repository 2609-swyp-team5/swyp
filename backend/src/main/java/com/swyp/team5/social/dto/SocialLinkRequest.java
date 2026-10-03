package com.swyp.team5.social.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 소셜 계정 연동 요청. {@code token}은 소셜 로그인({@code POST /auth/social/login})과 같은 값이다 — 구글은 ID 토큰,
 * 카카오·네이버는 인가 코드.
 */
public record SocialLinkRequest(@NotBlank String token) {}
