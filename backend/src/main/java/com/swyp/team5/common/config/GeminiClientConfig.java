package com.swyp.team5.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.util.StringUtils;

import com.google.genai.Client;
import com.google.genai.types.HttpOptions;
import com.google.genai.types.HttpRetryOptions;

/**
 * Spring AI 자동 구성의 Gemini {@link Client} 대신 쓰는 클라이언트(자동 구성은 {@code @ConditionalOnMissingBean}).
 *
 * <p>Gemini SDK 기본 재시도는 429(한도 초과)까지 5번(1·2·4·8초 간격) 다시 보내, 하루 한도를 넘기면 실패가 확정되기까지 약 19초가
 * 걸린다(배포 서버 AI 대화가 단계마다 20~40초 멈춘 원인). 한도 초과는 다시 보내도 풀리지 않으므로 429는 재시도하지 않고 바로 실패시켜
 * OpenAI 대체 호출({@code AiChatExecutor})로 넘기고, 일시적인 서버 오류만 짧게 한 번 더 시도한다.
 */
@Configuration
public class GeminiClientConfig {

    static final HttpRetryOptions RETRY_OPTIONS = HttpRetryOptions.builder()
            .attempts(2)
            .initialDelay(1.0)
            .maxDelay(2.0)
            .httpStatusCodes(408, 500, 502, 503, 504)
            .build();

    static final String API_KEY_PROPERTY = "spring.ai.google.genai.api-key";

    // 키 확인은 자동 구성과 같다(없으면 시작 시 실패). @Value는 빈 생성 시점에 따라 자리표시자가 풀리지 않은 문자열이 그대로 들어와
    // (키 오류 400) Environment에서 직접 읽는다.
    @Bean
    public Client googleGenAiClient(Environment environment) {
        String apiKey = environment.getProperty(API_KEY_PROPERTY);
        if (!StringUtils.hasText(apiKey)) {
            throw new IllegalStateException("Gemini API 키(spring.ai.google.genai.api-key)가 설정되지 않았습니다.");
        }
        return Client.builder()
                .apiKey(apiKey)
                .httpOptions(HttpOptions.builder().retryOptions(RETRY_OPTIONS).build())
                .build();
    }
}
