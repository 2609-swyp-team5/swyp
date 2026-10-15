package com.swyp.team5.common.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.mockito.Mockito.mock;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.model.google.genai.autoconfigure.chat.GoogleGenAiChatAutoConfiguration;
import org.springframework.ai.model.openai.autoconfigure.OpenAiChatAutoConfiguration;
import org.springframework.ai.model.tool.autoconfigure.ToolCallingAutoConfiguration;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.http.client.autoconfigure.HttpClientAutoConfiguration;
import org.springframework.boot.restclient.autoconfigure.RestClientAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import com.swyp.team5.aichat.config.AiChatModelConfig;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

class AiConfigTest {

    private static final Logger logger = LoggerFactory.getLogger(AiConfigTest.class);

    private static Map<String, String> ENV;

    @BeforeAll
    static void loadEnvironment() throws IOException {
        ENV = loadEnv();
    }

    private final ApplicationContextRunner mockContextRunner = new ApplicationContextRunner()
            .withUserConfiguration(AiConfig.class)
            .withBean(OpenAiChatModel.class, () -> mock(OpenAiChatModel.class))
            .withBean(GoogleGenAiChatModel.class, () -> mock(GoogleGenAiChatModel.class));

    private final ApplicationContextRunner liveContextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(
                    HttpClientAutoConfiguration.class,
                    RestClientAutoConfiguration.class,
                    ToolCallingAutoConfiguration.class,
                    OpenAiChatAutoConfiguration.class,
                    GoogleGenAiChatAutoConfiguration.class))
            // 운영과 같은 Gemini 클라이언트(429 재시도 안 함)로 실제 호출을 확인한다
            .withUserConfiguration(AiConfig.class, GeminiClientConfig.class)
            .withPropertyValues(
                    "spring.ai.openai.api-key=" + ENV.getOrDefault("OPENAI_API_KEY", ""),
                    "spring.ai.google.genai.api-key=" + ENV.getOrDefault("GEMINI_API_KEY", ""),
                    "spring.ai.google.genai.chat.model=" + ENV.getOrDefault("GEMINI_CHAT_MODEL", "gemini-3.6-flash"),
                    "spring.ai.google.genai.vertex-ai=false");

    @Test
    void registersChatClientBeanForEachAiProvider() {
        mockContextRunner.run(context -> {
            assertThat(context).hasBean("openAiClient");
            assertThat(context).hasBean("geminiAiClient");
            assertThat(context.getBean("openAiClient")).isInstanceOf(ChatClient.class);
            assertThat(context.getBean("geminiAiClient")).isInstanceOf(ChatClient.class);
        });
    }

    @Test
    void chatClientBeansAreDistinctInstances() {
        mockContextRunner.run(context -> {
            ChatClient openAiClient = context.getBean("openAiClient", ChatClient.class);
            ChatClient geminiAiClient = context.getBean("geminiAiClient", ChatClient.class);

            assertThat(openAiClient).isNotSameAs(geminiAiClient);
        });
    }

    @Tag("ai-test")
    @Test
    void openAiTest() {
        assumeApiKeysPresent();
        liveContextRunner.run(context -> {
            ChatClient openAiClient = context.getBean("openAiClient", ChatClient.class);

            String prompt = "대한민국의 수도는 어디인가요? 도시 이름만 짧게 대답해주세요.";
            logger.info("[OpenAi 요청] : {} ", prompt);
            String response = openAiClient.prompt(prompt).call().content();

            logger.info("[OpenAi 응답] : {} ", response);
            assertThat(response).isNotBlank();
        });
    }

    // AI 대화 전용 GPT(기본 gpt-5.4-mini·추론 none)가 일반 답변과 구조화 응답(entity) 모두 받는지
    @Tag("ai-test")
    @Test
    void aiChatOpenAiTest() {
        assumeApiKeysPresent();
        liveContextRunner.run(context -> {
            ChatClient quickOpenAi = ChatClient.builder(context.getBean(OpenAiChatModel.class))
                    .defaultOptions(AiChatModelConfig.openAiOptions("gpt-5.4-mini", "none"))
                    .build();

            String response = quickOpenAi
                    .prompt("대한민국의 수도는 어디인가요? 도시 이름만 짧게 대답해주세요.")
                    .call()
                    .content();
            Capital capital = quickOpenAi
                    .prompt("대한민국의 수도와 그 도시의 인구(만 명 단위 정수)를 알려줘.")
                    .call()
                    .entity(Capital.class);

            logger.info("[AI 대화 GPT 응답] : {} / {}", response, capital);
            assertThat(response).contains("서울");
            assertThat(capital).isNotNull();
            assertThat(capital.city()).contains("서울");
        });
    }

    record Capital(String city, Integer populationTenThousands) {}

    @Tag("ai-test")
    @Test
    void geminiTest() {
        assumeApiKeysPresent();
        liveContextRunner.run(context -> {
            ChatClient geminiAiClient = context.getBean("geminiAiClient", ChatClient.class);

            String prompt = "대한민국의 수도는 어디인가요? 도시 이름만 짧게 대답해주세요.";
            logger.info("[Gemini 요청] : {} ", prompt);
            String response = geminiAiClient.prompt(prompt).call().content();

            logger.info("[Gemini 응답] : {} ", response);
            assertThat(response).isNotBlank();
        });
    }

    private static void assumeApiKeysPresent() {
        assumeTrue(
                !isBlank(ENV.get("OPENAI_API_KEY")) && !isBlank(ENV.get("GEMINI_API_KEY")),
                ".env에 API_KEY가 없어 API 호출 테스트를 생략합니다.");
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static Map<String, String> loadEnv() throws IOException {
        Map<String, String> env = new HashMap<>();
        Path envFile = Path.of(System.getProperty("user.dir"), ".env");
        if (!Files.exists(envFile)) {
            return env;
        }
        for (String line : Files.readAllLines(envFile)) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                continue;
            }
            int separatorIndex = trimmed.indexOf('=');
            if (separatorIndex < 0) {
                continue;
            }
            env.put(
                    trimmed.substring(0, separatorIndex).trim(),
                    stripQuotes(trimmed.substring(separatorIndex + 1).trim()));
        }
        return env;
    }

    private static String stripQuotes(String value) {
        if (value.length() >= 2
                && ((value.startsWith("\"") && value.endsWith("\""))
                        || (value.startsWith("'") && value.endsWith("'")))) {
            return value.substring(1, value.length() - 1);
        }
        return value;
    }
}
