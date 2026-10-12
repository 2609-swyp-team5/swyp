package com.swyp.team5.aichat.service;

import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Component;

import com.swyp.team5.aichat.entity.AiChatIntent;
import com.swyp.team5.common.ai.AiChatExecutor;
import com.swyp.team5.product.dto.ProductAiSearchCondition;
import com.swyp.team5.product.dto.ProductSearchCondition;
import com.swyp.team5.product.dto.ProductSortType;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.service.ProductAiSearchService;

/**
 * 대화 질문을 AI(Gemini, 실패 시 OpenAI GPT)로 해석해 질문 의도와 매물 검색 조건을 뽑는다. 검색 조건 규칙은 AI 상품 검색과 같다
 * ({@link ProductAiSearchService#SYSTEM_PROMPT}). 이전 대화를 함께 보내 "그럼 128기가는?"처럼 생략된 상품명을 이어받는다.
 *
 * <p>두 모델 모두 실패하면 단어 규칙으로 의도를 정하고 질문 전체를 키워드로 쓴다(답변 자체는 실패시키지 않음).
 */
@Slf4j
@Component
public class AiChatQuestionInterpreter {

    private static final String QUESTION_PROMPT =
            """

            이번 입력은 검색창이 아니라 "지금이니 AI" 대화 질문이야. condition에는 위 규칙대로 검색 조건을, intent에는 질문 의도를 넣어.
            - intent: SELL(내 물건을 팔지·언제·얼마에 팔지), BUY(살지·언제 살지·싸게 사는 법), PRICE(시세·가격만 궁금),
              UNKNOWN(중고 상품과 무관하거나 무엇을 묻는지 알 수 없음).
            - [이전 대화]가 있으면 생략된 상품명을 이어받아 keyword를 채워(예: 이전에 아이폰 13 미니를 물었고 "그럼 256기가는?"이면
              keyword "아이폰 13 미니 256GB").
            """;

    private static final Pattern SELL_WORDS = Pattern.compile("팔|판매|처분|내놓");
    private static final Pattern BUY_WORDS = Pattern.compile("살까|사도|사고 싶|사려|구매|구입");

    private final AiChatExecutor aiChatExecutor;

    public AiChatQuestionInterpreter(AiChatExecutor aiChatExecutor) {
        this.aiChatExecutor = aiChatExecutor;
    }

    /**
     * @param question 이번 질문
     * @param history 이전 질문·답변(오래된 순, 비어 있으면 첫 질문)
     */
    public Interpretation interpret(String question, List<Turn> history) {
        String trimmed = question.strip();
        try {
            QuestionResult result = aiChatExecutor.call("AI 대화 질문 해석", client -> client.prompt()
                    .system(ProductAiSearchService.SYSTEM_PROMPT + QUESTION_PROMPT)
                    .user(userMessage(trimmed, history))
                    .call()
                    .entity(QuestionResult.class));
            Objects.requireNonNull(result);
            AiChatIntent intent = result.intent() == null ? ruleIntent(trimmed) : result.intent();
            ProductAiSearchCondition condition = result.condition() == null
                    ? new ProductAiSearchCondition(trimmed, null, null, null, null, null, null, null, null)
                    : result.condition();
            return new Interpretation(
                    true, intent, ProductAiSearchService.toSearchCondition(withChatDefaults(condition)));
        } catch (RuntimeException e) {
            log.warn("AI 대화 질문 해석 실패, 단어 규칙과 질문 전체 키워드로 대체합니다. 원인: {}", e.toString());
            return new Interpretation(false, ruleIntent(trimmed), ProductSearchCondition.ofKeyword(trimmed));
        }
    }

    /** AI가 의도를 못 정했을 때(또는 AI 실패 시) 쓰는 단어 규칙. */
    static AiChatIntent ruleIntent(String question) {
        if (SELL_WORDS.matcher(question).find()) {
            return AiChatIntent.SELL;
        }
        if (BUY_WORDS.matcher(question).find()) {
            return AiChatIntent.BUY;
        }
        return AiChatIntent.PRICE;
    }

    // 대화에서는 상태를 말하지 않으면 판매중 매물만, 정렬을 말하지 않으면 추천순으로 찾는다(검색창 기본값은 전체·최신순)
    private static ProductAiSearchCondition withChatDefaults(ProductAiSearchCondition condition) {
        return new ProductAiSearchCondition(
                condition.keyword(),
                condition.excludeKeywords(),
                condition.minPrice(),
                condition.maxPrice(),
                condition.statuses() == null || condition.statuses().isEmpty()
                        ? List.of(ProductStatus.ON_SALE)
                        : condition.statuses(),
                condition.platforms(),
                condition.conditions(),
                condition.defectStatuses(),
                condition.sort() == null ? ProductSortType.RECOMMENDED : condition.sort());
    }

    private static String userMessage(String question, List<Turn> history) {
        if (history.isEmpty()) {
            return question;
        }
        StringBuilder builder = new StringBuilder("[이전 대화]\n");
        history.forEach(turn -> builder.append(turn.question() ? "질문: " : "답변: ")
                .append(turn.content())
                .append('\n'));
        return builder.append("\n[이번 질문]\n").append(question).toString();
    }

    /** AI 응답 매핑용. */
    public record QuestionResult(AiChatIntent intent, ProductAiSearchCondition condition) {}

    /**
     * @param question true면 질문, false면 답변
     * @param content 메시지 내용
     */
    public record Turn(boolean question, String content) {}

    /**
     * @param aiApplied AI가 질문을 해석했는지
     * @param intent 질문 의도
     * @param condition 매물 검색 조건
     */
    public record Interpretation(boolean aiApplied, AiChatIntent intent, ProductSearchCondition condition) {}
}
