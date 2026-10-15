package com.swyp.team5.aichat.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.springframework.ai.openai.OpenAiChatOptions;

import org.junit.jupiter.api.Test;

// AI 대화 전용 GPT 옵션 단위 테스트.
class AiChatModelConfigTest {

    // 추론 정도를 정하면 모델과 함께 보냄
    @Test
    void setsModelAndReasoningEffort() {
        OpenAiChatOptions options =
                AiChatModelConfig.openAiOptions("gpt-5.4-mini", "none").build();

        assertThat(options.getModel()).isEqualTo("gpt-5.4-mini");
        assertThat(options.getReasoningEffort()).isEqualTo("none");
    }

    // 비추론 모델용으로 비워 두면 추론 정도를 보내지 않음
    @Test
    void omitsReasoningEffortWhenBlank() {
        OpenAiChatOptions options =
                AiChatModelConfig.openAiOptions("gpt-4o-mini", "").build();

        assertThat(options.getModel()).isEqualTo("gpt-4o-mini");
        assertThat(options.getReasoningEffort()).isNull();
    }
}
