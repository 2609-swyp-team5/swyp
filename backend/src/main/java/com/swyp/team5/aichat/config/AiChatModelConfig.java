package com.swyp.team5.aichat.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.ai.google.genai.common.GoogleGenAiThinkingLevel;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.swyp.team5.common.ai.AiChatExecutor;

/**
 * AI 대화 전용 AI 호출. 대화는 사람이 답을 기다리므로 Gemini의 생각(thinking) 정도를 낮춰 빨리 답하게 한다(기본 LOW — 질문 해석·답변
 * 작성이 각 5~7초 걸리던 것을 줄임). 시세 분석·사진 분석은 정확도가 중요해 기본 {@link AiChatExecutor}를 그대로 쓴다.
 */
@Configuration
public class AiChatModelConfig {

    public static final String EXECUTOR = "aiChatQuickExecutor";

    @Bean(EXECUTOR)
    public AiChatExecutor aiChatQuickExecutor(
            GoogleGenAiChatModel googleGenAiChatModel,
            @Qualifier("openAiClient") ChatClient openAiClient,
            @Value("${ai-chat.thinking-level:LOW}") GoogleGenAiThinkingLevel thinkingLevel) {
        ChatClient quickGemini = ChatClient.builder(googleGenAiChatModel)
                .defaultOptions(GoogleGenAiChatOptions.builder().thinkingLevel(thinkingLevel))
                .build();
        return new AiChatExecutor(quickGemini, openAiClient);
    }
}
