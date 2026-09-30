package com.swyp.team5.product.config;

import java.time.Duration;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** 상품 단계별 스트리밍 등록·수정(SSE) 설정. */
@Validated
@ConfigurationProperties(prefix = "product.register-stream")
public record ProductRegisterStreamProperties(
        @NotNull @Positive Integer corePoolSize, // 등록 처리 스레드 기본 수
        @NotNull @Positive Integer maxPoolSize, // 등록 처리 스레드 최대 수
        @NotNull Integer queueCapacity, // 대기열 크기(가득 차면 503)
        @NotNull Duration timeout, // 스트림 최대 유지 시간(지나면 error 이벤트 후 종료, 등록은 계속 진행)
        @NotNull Duration keepAliveInterval) {} // 연결 유지용 주석 이벤트 전송 간격
