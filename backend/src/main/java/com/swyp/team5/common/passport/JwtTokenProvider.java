package com.swyp.team5.common.passport;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;

import org.springframework.stereotype.Component;

import com.swyp.team5.member.entity.MemberRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtTokenProvider {

    private static final String CLAIM_ROLE = "role";

    private final JwtProperties properties;
    private final SecretKey accessKey;
    private final SecretKey refreshKey;

    public JwtTokenProvider(JwtProperties properties) {
        this.properties = properties;
        this.accessKey = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
        this.refreshKey = Keys.hmacShaKeyFor(properties.refreshSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String createAccessToken(Long memberId, MemberRole role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(memberId))
                .claim(CLAIM_ROLE, role.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(properties.accessTokenExpires())))
                .signWith(accessKey)
                .compact();
    }

    public String createRefreshToken(Long memberId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(memberId))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(properties.refreshTokenExpires())))
                .signWith(refreshKey)
                .compact();
    }

    public boolean isValidAccessToken(String token) {
        return isValid(token, accessKey);
    }

    public boolean isValidRefreshToken(String token) {
        return isValid(token, refreshKey);
    }

    public Long getMemberIdFromAccessToken(String token) {
        return Long.valueOf(parseClaims(token, accessKey).getSubject());
    }

    public Long getMemberIdFromRefreshToken(String token) {
        return Long.valueOf(parseClaims(token, refreshKey).getSubject());
    }

    public MemberRole getRole(String accessToken) {
        return MemberRole.valueOf(parseClaims(accessToken, accessKey).get(CLAIM_ROLE, String.class));
    }

    private boolean isValid(String token, SecretKey key) {
        try {
            parseClaims(token, key);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims parseClaims(String token, SecretKey key) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
