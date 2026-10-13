package com.swyp.team5.productanalysis.config;

import java.time.Duration;

import jakarta.validation.constraints.NotNull;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** 시세 분석 완료 구독(SSE) 설정. */
@Validated
@ConfigurationProperties(prefix = "analysis.stream")
public record AnalysisStreamProperties(
        @NotNull Duration timeout, // 스트림 최대 유지 시간(지나면 그때의 분석 결과를 보내고 종료)
        @NotNull Duration keepAliveInterval) {} // 연결 유지용 주석 이벤트 전송 간격
