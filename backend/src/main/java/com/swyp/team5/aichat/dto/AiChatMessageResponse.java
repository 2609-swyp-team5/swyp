package com.swyp.team5.aichat.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.swyp.team5.aichat.entity.AiChatIntent;
import com.swyp.team5.aichat.entity.AiChatMessage;
import com.swyp.team5.aichat.entity.AiChatPayload;
import com.swyp.team5.aichat.entity.AiChatRole;

/** 대화 메시지. 질문(USER)은 {@code intent}·{@code analysis}가 null이고 {@code recommendedProducts}가 빈 배열이다. */
public record AiChatMessageResponse(
        Long messageId,
        AiChatRole role, // USER(질문)/ASSISTANT(답변)
        String content, // 질문 원문 또는 답변 설명 문장
        AiChatIntent intent, // 답변이 판단한 질문 의도(SELL/BUY/PRICE/UNKNOWN)
        AiChatPayload.AnalysisCard analysis, // "상세 시세 분석 보기" 카드, 대상 상품을 못 찾았으면 null
        List<AiChatPayload.RecommendedProduct> recommendedProducts, // 추천 상품(최대 6개)
        LocalDateTime createdAt) {

    public static AiChatMessageResponse from(AiChatMessage message) {
        AiChatPayload payload = message.getPayload();
        return new AiChatMessageResponse(
                message.getId(),
                message.getRole(),
                message.getContent(),
                message.getIntent(),
                payload == null ? null : payload.analysis(),
                payload == null || payload.recommendedProducts() == null ? List.of() : payload.recommendedProducts(),
                message.getCreatedAt());
    }
}
