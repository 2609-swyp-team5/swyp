package com.swyp.team5.common.ai;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.google.genai.errors.ApiException;

/**
 * Gemini가 한도 초과(429)로 거절한 뒤 일정 시간 Gemini를 건너뛰게 하는 상태. 하루 한도를 넘기면 다시 보내도 계속 429라, 매 호출마다
 * Gemini에 먼저 갔다가 거절당하는 왕복을 줄이고 바로 OpenAI GPT로 보낸다. 모든 {@link AiChatExecutor}가 한 상태를 같이 쓴다.
 */
@Slf4j
@Component
public class GeminiQuotaCooldown {

    static final int QUOTA_EXCEEDED = 429;

    private final Duration cooldown;
    private final Clock clock;
    private volatile Instant skipUntil = Instant.MIN;

    @Autowired
    public GeminiQuotaCooldown(@Value("${ai.gemini-quota-cooldown:5m}") Duration cooldown) {
        this(cooldown, Clock.systemUTC());
    }

    GeminiQuotaCooldown(Duration cooldown, Clock clock) {
        this.cooldown = cooldown;
        this.clock = clock;
    }

    /** 지금 Gemini를 건너뛰어야 하는지. */
    public boolean active() {
        return clock.instant().isBefore(skipUntil);
    }

    /** Gemini 호출 실패를 알린다. 원인이 한도 초과(429)면 그때부터 정해진 시간 동안 건너뛴다. */
    public void record(Throwable failure) {
        if (cooldown.isZero() || cooldown.isNegative() || !isQuotaExceeded(failure)) {
            return;
        }
        skipUntil = clock.instant().plus(cooldown);
        log.warn("Gemini 한도 초과(429) — {} 동안 Gemini를 건너뛰고 OpenAI GPT로 바로 호출합니다.", cooldown);
    }

    // Spring AI가 Gemini SDK 예외를 감싸서 던지므로 원인을 따라가며 찾는다
    static boolean isQuotaExceeded(Throwable failure) {
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof ApiException api && api.code() == QUOTA_EXCEEDED) {
                return true;
            }
            if (cause.getCause() == cause) {
                break;
            }
        }
        return false;
    }
}
