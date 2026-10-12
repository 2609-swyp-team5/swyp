package com.swyp.team5.aichat.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;

import org.springframework.ai.chat.client.ChatClient;

import com.swyp.team5.aichat.entity.AiChatIntent;
import com.swyp.team5.aichat.service.AiChatQuestionInterpreter.Interpretation;
import com.swyp.team5.aichat.service.AiChatQuestionInterpreter.QuestionResult;
import com.swyp.team5.common.ai.AiChatExecutor;
import com.swyp.team5.product.dto.ProductAiSearchCondition;
import com.swyp.team5.product.dto.ProductSortType;
import com.swyp.team5.product.entity.ProductStatus;
import org.junit.jupiter.api.Test;

// AI 대화 질문 해석 단위 테스트.
class AiChatQuestionInterpreterTest {

    private final ChatClient geminiAiClient = mock(ChatClient.class, RETURNS_DEEP_STUBS);
    private final ChatClient openAiClient = mock(ChatClient.class, RETURNS_DEEP_STUBS);
    private final AiChatQuestionInterpreter interpreter =
            new AiChatQuestionInterpreter(new AiChatExecutor(geminiAiClient, openAiClient));

    // 상태·정렬을 말하지 않으면 판매중·추천순으로 찾음
    @Test
    void interpretAppliesChatDefaults() {
        stub(geminiAiClient, new QuestionResult(AiChatIntent.SELL, condition("아이폰 13 미니", null, null)));

        Interpretation result = interpreter.interpret("아이폰 13 미니 지금 팔까?", List.of());

        assertThat(result.aiApplied()).isTrue();
        assertThat(result.intent()).isEqualTo(AiChatIntent.SELL);
        assertThat(result.condition().keyword()).isEqualTo("아이폰 13 미니");
        assertThat(result.condition().statuses()).isEqualTo(Set.of(ProductStatus.ON_SALE));
        assertThat(result.condition().sort()).isEqualTo(ProductSortType.RECOMMENDED);
    }

    // 사용자가 말한 상태·정렬은 그대로 둠
    @Test
    void interpretKeepsSpokenStatusAndSort() {
        stub(
                geminiAiClient,
                new QuestionResult(
                        AiChatIntent.PRICE,
                        condition("아이패드", List.of(ProductStatus.SOLD_OUT), ProductSortType.PRICE_LOW)));

        Interpretation result = interpreter.interpret("팔린 아이패드 싼 순", List.of());

        assertThat(result.condition().statuses()).isEqualTo(Set.of(ProductStatus.SOLD_OUT));
        assertThat(result.condition().sort()).isEqualTo(ProductSortType.PRICE_LOW);
    }

    // AI가 의도를 비우면 단어 규칙으로 정함
    @Test
    void interpretFallsBackToRuleIntentWhenAiOmitsIt() {
        stub(geminiAiClient, new QuestionResult(null, condition("필름카메라", null, null)));

        assertThat(interpreter.interpret("필름카메라 살까 말까", List.of()).intent()).isEqualTo(AiChatIntent.BUY);
    }

    // 두 모델 모두 실패하면 단어 규칙 의도 + 질문 전체 키워드
    @Test
    void interpretFallsBackWhenBothModelsFail() {
        when(geminiAiClient.prompt()).thenThrow(new IllegalStateException("gemini down"));
        when(openAiClient.prompt()).thenThrow(new IllegalStateException("gpt down"));

        Interpretation result = interpreter.interpret(" 필름카메라 판매 타이밍 ", List.of());

        assertThat(result.aiApplied()).isFalse();
        assertThat(result.intent()).isEqualTo(AiChatIntent.SELL);
        assertThat(result.condition().keyword()).isEqualTo("필름카메라 판매 타이밍");
    }

    // 단어 규칙 — 팔기 > 사기 > 시세
    @Test
    void ruleIntentDetectsSellBuyAndPrice() {
        assertThat(AiChatQuestionInterpreter.ruleIntent("아이폰 내놓을까")).isEqualTo(AiChatIntent.SELL);
        assertThat(AiChatQuestionInterpreter.ruleIntent("아이폰 사도 돼?")).isEqualTo(AiChatIntent.BUY);
        assertThat(AiChatQuestionInterpreter.ruleIntent("아이폰 시세 어때")).isEqualTo(AiChatIntent.PRICE);
    }

    private static ProductAiSearchCondition condition(
            String keyword, List<ProductStatus> statuses, ProductSortType sort) {
        return new ProductAiSearchCondition(keyword, null, null, null, statuses, null, null, null, sort);
    }

    private static void stub(ChatClient client, QuestionResult result) {
        when(client.prompt().system(anyString()).user(anyString()).call().entity(QuestionResult.class))
                .thenReturn(result);
    }
}
