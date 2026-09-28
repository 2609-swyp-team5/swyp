package com.swyp.team5.common.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import java.util.ArrayList;
import java.util.List;

import org.springframework.ai.chat.client.ChatClient;

import org.junit.jupiter.api.Test;

// AI 호출 대체(Gemini 실패 시 OpenAI GPT) 단위 테스트.
class AiChatExecutorTest {

    private final ChatClient gemini = mock(ChatClient.class);
    private final ChatClient openAi = mock(ChatClient.class);
    private final AiChatExecutor executor = new AiChatExecutor(gemini, openAi);

    // Gemini가 성공하면 GPT는 호출하지 않음
    @Test
    void usesGeminiResultWhenGeminiSucceeds() {
        List<ChatClient> called = new ArrayList<>();

        String result = executor.call("테스트", client -> {
            called.add(client);
            return client == gemini ? "gemini" : "gpt";
        });

        assertThat(result).isEqualTo("gemini");
        assertThat(called).containsExactly(gemini);
    }

    // Gemini가 실패하면 같은 요청을 GPT로 대체 호출
    @Test
    void fallsBackToGptWhenGeminiFails() {
        List<ChatClient> called = new ArrayList<>();

        String result = executor.call("테스트", client -> {
            called.add(client);
            if (client == gemini) {
                throw new IllegalStateException("503 UNAVAILABLE");
            }
            return "gpt";
        });

        assertThat(result).isEqualTo("gpt");
        assertThat(called).containsExactly(gemini, openAi);
    }

    // 둘 다 실패하면 GPT 예외를 던지고 Gemini 예외는 suppressed로 보존
    @Test
    void throwsGptFailureWithGeminiFailureSuppressedWhenBothFail() {
        IllegalStateException geminiFailure = new IllegalStateException("gemini down");
        IllegalStateException gptFailure = new IllegalStateException("gpt down");

        assertThatThrownBy(() -> executor.call("테스트", client -> {
                    throw client == gemini ? geminiFailure : gptFailure;
                }))
                .isSameAs(gptFailure)
                .satisfies(e -> assertThat(e.getSuppressed()).containsExactly(geminiFailure));
    }
}
