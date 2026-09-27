package com.swyp.team5.common.ai;

import java.util.function.Function;

import lombok.extern.slf4j.Slf4j;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/**
 * AI 채팅 호출을 Gemini로 먼저 시도하고, 실패하면 같은 요청을 OpenAI GPT로 한 번 더 보낸다.
 *
 * <p>대체 대상은 호출 자체의 실패(네트워크/쿼터/5xx, 응답 파싱 실패 등 요청 함수가 던진 예외)뿐이다. 응답은 왔지만
 * 내용이 잘못된 경우(예: 없는 카테고리 ID)는 호출 측이 검증한다. 두 모델 모두 실패하면 GPT 예외에 Gemini 예외를
 * suppressed로 붙여 던진다.
 */
@Slf4j
@Component
public class AiChatExecutor {

    private final ChatClient primaryClient;
    private final ChatClient fallbackClient;

    public AiChatExecutor(
            @Qualifier("geminiAiClient") ChatClient geminiAiClient,
            @Qualifier("openAiClient") ChatClient openAiClient) {
        this.primaryClient = geminiAiClient;
        this.fallbackClient = openAiClient;
    }

    /**
     * @param task 로그에 남길 작업 이름(예: "상품 이미지 분석")
     * @param request 클라이언트로 프롬프트를 만들어 호출하고 결과를 돌려주는 함수(두 모델에 같은 요청을 보낸다)
     * @return 먼저 성공한 모델의 결과
     */
    public <T> T call(String task, Function<ChatClient, T> request) {
        try {
            return request.apply(primaryClient);
        } catch (RuntimeException primaryFailure) {
            log.warn("{}: Gemini 호출 실패, OpenAI GPT로 대체 호출합니다. 원인: {}", task, primaryFailure.toString());
            try {
                T result = request.apply(fallbackClient);
                log.info("{}: OpenAI GPT 대체 호출 성공", task);
                return result;
            } catch (RuntimeException fallbackFailure) {
                fallbackFailure.addSuppressed(primaryFailure);
                log.error("{}: Gemini와 OpenAI GPT 호출이 모두 실패했습니다.", task);
                throw fallbackFailure;
            }
        }
    }
}
