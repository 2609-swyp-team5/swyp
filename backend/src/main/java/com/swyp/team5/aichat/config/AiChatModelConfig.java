package com.swyp.team5.aichat.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.ai.google.genai.common.GoogleGenAiThinkingLevel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import com.swyp.team5.common.ai.AiChatExecutor;
import com.swyp.team5.common.ai.GeminiQuotaCooldown;

/**
 * AI 대화 전용 AI 호출. 대화는 사람이 답을 기다리므로 Gemini의 생각(thinking) 정도를 낮춰 빨리 답하게 한다(기본 LOW — 질문 해석·답변
 * 작성이 각 5~7초 걸리던 것을 줄임). 시세 분석·사진 분석은 정확도가 중요해 기본 {@link AiChatExecutor}를 그대로 쓴다.
 *
 * <p>Gemini 실패 시 대체 호출하는 GPT도 대화 전용 모델을 쓴다(기본 gpt-5.4-mini·추론 none — 같은 질문 해석 프롬프트로 gpt-4o-mini
 * 1.75초 → 0.92초, 4o-mini는 가끔 10초 넘게 걸림). 추론 정도는 추론 모델에만 보낼 수 있어 비어 있으면 보내지 않는다.
 */
@Configuration
public class AiChatModelConfig {

    public static final String EXECUTOR = "aiChatQuickExecutor";

    @Bean(EXECUTOR)
    public AiChatExecutor aiChatQuickExecutor(
            GoogleGenAiChatModel googleGenAiChatModel,
            OpenAiChatModel openAiChatModel,
            GeminiQuotaCooldown quotaCooldown,
            @Value("${ai-chat.thinking-level:LOW}") GoogleGenAiThinkingLevel thinkingLevel,
            @Value("${ai-chat.openai.model:gpt-5.4-mini}") String openAiModel,
            @Value("${ai-chat.openai.reasoning-effort:none}") String openAiReasoningEffort) {
        ChatClient quickGemini = ChatClient.builder(googleGenAiChatModel)
                .defaultOptions(GoogleGenAiChatOptions.builder().thinkingLevel(thinkingLevel))
                .build();
        ChatClient quickOpenAi = ChatClient.builder(openAiChatModel)
                .defaultOptions(openAiOptions(openAiModel, openAiReasoningEffort))
                .build();
        return new AiChatExecutor(quickGemini, quickOpenAi, quotaCooldown);
    }

    public static OpenAiChatOptions.Builder openAiOptions(String model, String reasoningEffort) {
        OpenAiChatOptions.Builder builder = OpenAiChatOptions.builder().model(model);
        if (StringUtils.hasText(reasoningEffort)) {
            builder.reasoningEffort(reasoningEffort);
        }
        return builder;
    }
}
