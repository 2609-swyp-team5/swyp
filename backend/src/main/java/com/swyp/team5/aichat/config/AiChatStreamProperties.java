package com.swyp.team5.aichat.config;

import java.time.Duration;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** AI 대화 답변 스트림(SSE) 설정. */
@Validated
@ConfigurationProperties(prefix = "ai-chat.stream")
public record AiChatStreamProperties(
        @NotNull @Positive Integer corePoolSize, // 답변 처리 스레드 기본 수
        @NotNull @Positive Integer maxPoolSize, // 답변 처리 스레드 최대 수
        @NotNull Integer queueCapacity, // 대기열 크기(가득 차면 503)
        @NotNull Duration timeout, // 스트림 최대 유지 시간(지나면 error 이벤트 — 답변은 끝까지 만들어 저장)
        @NotNull Duration keepAliveInterval) {} // 연결 유지용 주석 이벤트 전송 간격
