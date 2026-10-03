package com.swyp.team5.product.service;

import java.time.Duration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * 상품 조회수 중복 판별. 같은 회원이 같은 상품을 {@link #WINDOW} 안에 다시 보면 세지 않는다. Redis를 쓸 수 없으면 조회는
 * 막지 않고 조회수만 올리지 않는다(부풀려지는 쪽보다 덜 세는 쪽이 안전).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ProductViewCounter {

    static final Duration WINDOW = Duration.ofHours(24);
    private static final String KEY_PREFIX = "product:view:";

    private final StringRedisTemplate redisTemplate;

    /** 이번 조회를 조회수로 셀지 판단한다(기간 안 첫 조회면 true). */
    public boolean isFirstView(Long productId, Long memberId) {
        try {
            return Boolean.TRUE.equals(
                    redisTemplate.opsForValue().setIfAbsent(KEY_PREFIX + productId + ":" + memberId, "1", WINDOW));
        } catch (RuntimeException e) {
            log.warn("조회수 중복 판별 실패 — 이번 조회는 세지 않음 [productId={}, memberId={}]", productId, memberId, e);
            return false;
        }
    }
}
