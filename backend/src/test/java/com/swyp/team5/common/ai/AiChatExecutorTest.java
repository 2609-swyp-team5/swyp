package com.swyp.team5.common.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

import org.springframework.ai.chat.client.ChatClient;

import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;

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

    // 스트리밍 — Gemini가 첫 조각 전에 실패하면 GPT로 대체하고, 조각을 차례로 넘긴 뒤 이은 문장을 돌려줌
    @Test
    void streamFallsBackToGptWhenGeminiFailsBeforeFirstChunk() {
        List<String> chunks = new ArrayList<>();

        String result = executor.stream(
                "테스트",
                client -> client == gemini
                        ? Flux.error(new IllegalStateException("gemini down"))
                        : Flux.just("지금 ", "", "사기 좋아요."),
                chunks::add);

        assertThat(result).isEqualTo("지금 사기 좋아요.");
        assertThat(chunks).containsExactly("지금 ", "사기 좋아요.");
    }

    // 스트리밍 — 이미 조각을 보낸 뒤 실패하면 GPT로 대체하지 않고 예외(앞부분이 화면에 나간 상태)
    @Test
    void streamDoesNotFallBackAfterChunksWereSent() {
        List<ChatClient> called = new ArrayList<>();
        List<String> chunks = new ArrayList<>();

        assertThatThrownBy(() -> executor.stream(
                        "테스트",
                        client -> {
                            called.add(client);
                            return Flux.concat(Flux.just("지금 "), Flux.error(new IllegalStateException("cut")));
                        },
                        chunks::add))
                .hasMessageContaining("cut");
        assertThat(called).containsExactly(gemini);
        assertThat(chunks).containsExactly("지금 ");
    }

    // Gemini가 한도 초과(429)로 실패하면 다음 호출부터 Gemini를 건너뛰고 바로 GPT로
    @Test
    void skipsGeminiAfterQuotaExceeded() {
        AiChatExecutor guarded = new AiChatExecutor(gemini, openAi, new GeminiQuotaCooldown(Duration.ofMinutes(5)));
        List<ChatClient> called = new ArrayList<>();
        Function<ChatClient, String> request = client -> {
            called.add(client);
            if (client == gemini) {
                throw new RuntimeException(GeminiQuotaCooldownTest.quotaExceeded());
            }
            return "gpt";
        };

        assertThat(guarded.call("테스트", request)).isEqualTo("gpt");
        assertThat(guarded.call("테스트", request)).isEqualTo("gpt");
        String streamed = guarded.stream(
                "테스트",
                client -> {
                    called.add(client);
                    return Flux.just("gpt");
                },
                chunk -> {});

        assertThat(streamed).isEqualTo("gpt");
        assertThat(called).containsExactly(gemini, openAi, openAi, openAi);
    }

    // 429가 아닌 실패는 다음 호출에서도 Gemini부터 시도
    @Test
    void keepsTryingGeminiAfterOtherFailures() {
        AiChatExecutor guarded = new AiChatExecutor(gemini, openAi, new GeminiQuotaCooldown(Duration.ofMinutes(5)));
        List<ChatClient> called = new ArrayList<>();
        Function<ChatClient, String> request = client -> {
            called.add(client);
            if (client == gemini) {
                throw new IllegalStateException("503 UNAVAILABLE");
            }
            return "gpt";
        };

        guarded.call("테스트", request);
        guarded.call("테스트", request);

        assertThat(called).containsExactly(gemini, openAi, gemini, openAi);
    }
}
