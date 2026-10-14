package com.swyp.team5.aichat.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;

import com.swyp.team5.aichat.dto.AiChatSuggestionResponse;
import com.swyp.team5.aichat.dto.AiChatSuggestionResponse.Source;
import com.swyp.team5.aichat.entity.AiChatIntent;
import com.swyp.team5.common.common.CursorPageResponse;
import com.swyp.team5.interest.dto.InterestListItemResponse;
import com.swyp.team5.interest.service.InterestService;
import com.swyp.team5.product.dto.ProductSummaryResponse;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.service.ProductService;
import com.swyp.team5.search.service.SearchLogService;
import org.junit.jupiter.api.Test;

// 지금이니 AI 추천 질문 단위 테스트.
class AiChatSuggestionServiceTest {

    private static final Long MEMBER_ID = 3L;

    private final ProductService productService = mock(ProductService.class);
    private final InterestService interestService = mock(InterestService.class);
    private final SearchLogService searchLogService = mock(SearchLogService.class);
    private final AiChatSuggestionService service =
            new AiChatSuggestionService(productService, interestService, searchLogService);

    // 내 판매 상품(최대 2) → 판매중 관심상품(최대 2) → 인기 검색어, 같은 이름은 한 번만
    @Test
    void suggestionsCombineSourcesInOrderWithoutDuplicates() {
        myProducts("아이패드 프로 11 3세대 256GB 셀룰러", "필름카메라 FM2", "닌텐도 스위치");
        interests(interest("[급처] 아이폰 13 미니, 애플케어", "ON_SALE"), interest("갤럭시 S23", "SOLD_OUT"));
        when(searchLogService.getPopularKeywords()).thenReturn(List.of("필름카메라 FM2", "에어팟 프로", "다이슨"));

        List<AiChatSuggestionResponse> result = service.getSuggestions(MEMBER_ID, 5);

        assertThat(result)
                .extracting(AiChatSuggestionResponse::question)
                .containsExactly(
                        "아이패드 프로 11 3세대 지금 팔면 얼마 받을까?",
                        "필름카메라 FM2 지금 팔면 얼마 받을까?",
                        "아이폰 13 미니 지금 사도 될까?",
                        "에어팟 프로 지금 얼마야?",
                        "다이슨 지금 사도 될까?");
        assertThat(result)
                .extracting(AiChatSuggestionResponse::source)
                .containsExactly(
                        Source.MY_PRODUCT, Source.MY_PRODUCT, Source.INTEREST, Source.TRENDING, Source.TRENDING);
        assertThat(result.get(2).intent()).isEqualTo(AiChatIntent.BUY);
    }

    // 재료가 없으면 기본 질문으로 채움
    @Test
    void fallsBackToDefaultQuestions() {
        myProducts();
        interests();
        when(searchLogService.getPopularKeywords()).thenReturn(List.of());

        List<AiChatSuggestionResponse> result = service.getSuggestions(MEMBER_ID, 3);

        assertThat(result)
                .extracting(AiChatSuggestionResponse::question)
                .containsExactly("아이폰 지금 얼마야?", "아이패드 지금 사도 될까?", "닌텐도 스위치 지금 팔면 얼마 받을까?");
        assertThat(result).allMatch(item -> item.source() == Source.DEFAULT);
    }

    @Test
    void shortenDropsBracketsAndTail() {
        assertThat(AiChatSuggestionService.shorten("[미개봉] 에어팟 프로 2세대 (C타입) / 정품"))
                .isEqualTo("에어팟 프로 2세대");
        assertThat(AiChatSuggestionService.shorten("애플 아이폰 13 미니 미드나이트 128GB")).isEqualTo("애플 아이폰 13 미니");
        assertThat(AiChatSuggestionService.shorten("가나다라마바사아자차카타파하가나다라마바사아자")).hasSize(20);
        assertThat(AiChatSuggestionService.shorten("  ")).isEmpty();
    }

    private void myProducts(String... titles) {
        List<ProductSummaryResponse> items = java.util.Arrays.stream(titles)
                .map(title -> new ProductSummaryResponse(
                        1L,
                        title,
                        null,
                        10_000L,
                        null,
                        null,
                        ProductStatus.ON_SALE,
                        null,
                        null,
                        null,
                        "기타",
                        null,
                        null,
                        null,
                        LocalDateTime.now(),
                        false,
                        null))
                .toList();
        when(productService.getMyProducts(eq(MEMBER_ID), isNull(), isNull(), any(), isNull(), anyInt()))
                .thenReturn(CursorPageResponse.of(items, 10, ProductSummaryResponse::id));
    }

    private void interests(InterestListItemResponse... items) {
        when(interestService.getInterests(eq(MEMBER_ID), isNull(), isNull(), anyInt()))
                .thenReturn(CursorPageResponse.of(List.of(items), 20, InterestListItemResponse::interestId));
    }

    private static InterestListItemResponse interest(String title, String status) {
        InterestListItemResponse item = mock(InterestListItemResponse.class);
        when(item.title()).thenReturn(title);
        when(item.status()).thenReturn(status);
        return item;
    }
}
