package com.swyp.team5.common.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import com.google.genai.errors.ClientException;
import org.junit.jupiter.api.Test;

// Gemini 한도 초과(429) 뒤 일정 시간 건너뛰기 단위 테스트.
class GeminiQuotaCooldownTest {

    private static final Instant NOW = Instant.parse("2026-10-16T03:00:00Z");

    private final Clock clock = mock(Clock.class);
    private final GeminiQuotaCooldown cooldown = new GeminiQuotaCooldown(Duration.ofMinutes(5), clock);

    // Spring AI가 감싼 429는 원인을 따라가 찾아 5분 동안 건너뜀
    @Test
    void skipsGeminiForCooldownAfterWrappedQuotaExceeded() {
        when(clock.instant()).thenReturn(NOW);

        cooldown.record(new RuntimeException("Gemini 호출 실패", quotaExceeded()));

        assertThat(cooldown.active()).isTrue();
        when(clock.instant()).thenReturn(NOW.plus(Duration.ofMinutes(5)).minusSeconds(1));
        assertThat(cooldown.active()).isTrue();
        when(clock.instant()).thenReturn(NOW.plus(Duration.ofMinutes(5)));
        assertThat(cooldown.active()).isFalse();
    }

    // 429가 아닌 실패(일시적 서버 오류 등)는 건너뛰지 않음
    @Test
    void ignoresOtherFailures() {
        when(clock.instant()).thenReturn(NOW);

        cooldown.record(new RuntimeException(new ClientException(400, "INVALID_ARGUMENT", "API key not valid")));
        cooldown.record(new IllegalStateException("503 UNAVAILABLE"));

        assertThat(cooldown.active()).isFalse();
    }

    // 건너뛰는 시간이 0이면 끔
    @Test
    void disabledWhenCooldownIsZero() {
        when(clock.instant()).thenReturn(NOW);
        GeminiQuotaCooldown disabled = new GeminiQuotaCooldown(Duration.ZERO, clock);

        disabled.record(quotaExceeded());

        assertThat(disabled.active()).isFalse();
    }

    static ClientException quotaExceeded() {
        return new ClientException(429, "RESOURCE_EXHAUSTED", "You exceeded your current quota");
    }
}
