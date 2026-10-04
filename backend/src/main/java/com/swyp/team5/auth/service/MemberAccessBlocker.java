package com.swyp.team5.auth.service;

import lombok.RequiredArgsConstructor;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.swyp.team5.common.passport.JwtProperties;

@Service
@RequiredArgsConstructor
public class MemberAccessBlocker {

    private static final String KEY_PREFIX = "blockedMember:";

    private final StringRedisTemplate redisTemplate;
    private final JwtProperties jwtProperties;

    public void block(Long memberId) {
        redisTemplate.opsForValue().set(key(memberId), "1", jwtProperties.accessTokenExpires());
    }

    public void unblock(Long memberId) {
        redisTemplate.delete(key(memberId));
    }

    public boolean isBlocked(Long memberId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(key(memberId)));
    }

    private String key(Long memberId) {
        return KEY_PREFIX + memberId;
    }
}
