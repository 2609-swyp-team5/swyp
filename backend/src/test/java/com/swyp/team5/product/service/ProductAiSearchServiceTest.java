package com.swyp.team5.product.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;

import org.springframework.ai.chat.client.ChatClient;

import com.swyp.team5.common.ai.AiChatExecutor;
import com.swyp.team5.product.dto.ListingTradeStatus;
import com.swyp.team5.product.dto.ProductAiSearchCondition;
import com.swyp.team5.product.dto.ProductSearchCondition;
import com.swyp.team5.product.dto.ProductSearchPlatform;
import com.swyp.team5.product.dto.ProductSortType;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.ProductCondition;
import org.junit.jupiter.api.Test;

// 자연어 검색 문장 AI 해석 단위 테스트.
class ProductAiSearchServiceTest {

    private final ChatClient geminiAiClient = mock(ChatClient.class, RETURNS_DEEP_STUBS);
    private final ChatClient openAiClient = mock(ChatClient.class, RETURNS_DEEP_STUBS);

    private ProductAiSearchService service() {
        return new ProductAiSearchService(new AiChatExecutor(geminiAiClient, openAiClient));
    }

    // 해석 성공 - AI가 뽑은 조건을 검색 조건으로 옮기고, 제외어는 소문자로 나눔
    @Test
    void interpretConvertsAiResultToSearchCondition() {
        stubGemini(new ProductAiSearchCondition(
                " 아이폰 15 프로 ",
                List.of("Case 필름"),
                100_000L,
                500_000L,
                List.of(ListingTradeStatus.SELLING),
                List.of(ProductSearchPlatform.BUNJANG),
                List.of(ProductCondition.S, ProductCondition.A),
                List.of(DefectStatus.NORMAL),
                ProductSortType.PRICE_LOW));

        ProductAiSearchService.Interpretation interpretation = service().interpret("아이폰 15 프로 싼 순으로");

        ProductSearchCondition condition = interpretation.condition();
        assertThat(interpretation.aiApplied()).isTrue();
        assertThat(condition.keyword()).isEqualTo("아이폰 15 프로");
        assertThat(condition.excludeKeywords()).containsExactly("case", "필름");
        assertThat(condition.minPrice()).isEqualTo(100_000L);
        assertThat(condition.maxPrice()).isEqualTo(500_000L);
        assertThat(condition.tradeStatuses()).containsExactly(ListingTradeStatus.SELLING);
        assertThat(condition.platforms()).containsExactly(ProductSearchPlatform.BUNJANG);
        assertThat(condition.conditions()).containsExactlyInAnyOrder(ProductCondition.S, ProductCondition.A);
        assertThat(condition.defectStatuses()).containsExactly(DefectStatus.NORMAL);
        assertThat(condition.sort()).isEqualTo(ProductSortType.PRICE_LOW);
        assertThat(condition.status()).isNull();
    }

    // 해석 성공 - 음수 가격은 버리고, 최소·최대가 뒤바뀌면 맞바꾸며, 빈 값은 미적용(정렬 기본 최신순)
    @Test
    void interpretSanitizesAiValues() {
        stubGemini(new ProductAiSearchCondition("맥북", null, 900_000L, 300_000L, null, List.of(), null, null, null));

        ProductSearchCondition swapped = service().interpret("맥북 30~90만원").condition();

        assertThat(swapped.minPrice()).isEqualTo(300_000L);
        assertThat(swapped.maxPrice()).isEqualTo(900_000L);
        assertThat(swapped.excludeKeywords()).isEmpty();
        assertThat(swapped.platforms()).isEmpty();
        assertThat(swapped.sort()).isEqualTo(ProductSortType.LATEST);

        stubGemini(new ProductAiSearchCondition("맥북", null, -1L, null, null, null, null, null, null));

        assertThat(service().interpret("맥북").condition().minPrice()).isNull();
    }

    // 해석 실패 - Gemini·GPT 모두 실패하면 문장 전체를 키워드로 검색
    @Test
    void interpretFallsBackToKeywordWhenAiFails() {
        when(geminiAiClient.prompt()).thenThrow(new IllegalStateException("429 RESOURCE_EXHAUSTED"));
        when(openAiClient.prompt()).thenThrow(new IllegalStateException("timeout"));

        ProductAiSearchService.Interpretation interpretation = service().interpret("  아이폰 싸게  ");

        assertThat(interpretation.aiApplied()).isFalse();
        assertThat(interpretation.condition()).isEqualTo(ProductSearchCondition.ofKeyword("아이폰 싸게"));
    }

    private void stubGemini(ProductAiSearchCondition result) {
        when(geminiAiClient
                        .prompt()
                        .system(anyString())
                        .user(anyString())
                        .call()
                        .entity(ProductAiSearchCondition.class))
                .thenReturn(result);
    }
}
