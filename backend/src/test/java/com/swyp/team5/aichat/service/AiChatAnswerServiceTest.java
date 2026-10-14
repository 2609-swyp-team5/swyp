package com.swyp.team5.aichat.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

import com.swyp.team5.aichat.dto.AiChatStep;
import com.swyp.team5.aichat.dto.AiChatStreamEvent;
import com.swyp.team5.aichat.entity.AiChatIntent;
import com.swyp.team5.aichat.entity.AiChatPayload.AnalysisCard;
import com.swyp.team5.aichat.entity.AiChatPayload.RecommendedProduct;
import com.swyp.team5.aichat.service.AiChatAnswerService.Answer;
import com.swyp.team5.aichat.service.AiChatQuestionInterpreter.Interpretation;
import com.swyp.team5.common.ai.AiChatExecutor;
import com.swyp.team5.common.common.CursorPageResponse;
import com.swyp.team5.item.entity.ListingSource;
import com.swyp.team5.product.dto.ProductListItemResponse;
import com.swyp.team5.product.dto.ProductSearchCondition;
import com.swyp.team5.product.dto.ProductSummaryResponse;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.service.ProductService;
import com.swyp.team5.productanalysis.dto.AnalysisPerspective;
import com.swyp.team5.productanalysis.dto.AnalysisRequestResponse;
import com.swyp.team5.productanalysis.dto.AnalysisStatus;
import com.swyp.team5.productanalysis.dto.ProductAnalysisResponse;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.service.AnalysisRequestService;
import com.swyp.team5.productanalysis.service.ProductAnalysisService;
import org.junit.jupiter.api.Test;

// AI 대화 답변 조합(대상 선택·추천 상품·분석 요청·문장 대체) 단위 테스트.
class AiChatAnswerServiceTest {

    private static final Long MEMBER_ID = 7L;

    private final AiChatQuestionInterpreter interpreter = mock(AiChatQuestionInterpreter.class);
    private final ProductService productService = mock(ProductService.class);
    private final ProductAnalysisService productAnalysisService = mock(ProductAnalysisService.class);
    private final AnalysisRequestService analysisRequestService = mock(AnalysisRequestService.class);
    private final AiChatExecutor aiChatExecutor = mock(AiChatExecutor.class);
    private final AiChatAnswerService service = new AiChatAnswerService(
            interpreter, productService, productAnalysisService, analysisRequestService, aiChatExecutor);

    // 사기 질문 — 구함 글·낚시 가격을 빼고, 중앙값 근처의 분석된 매물을 대상으로, 나머지를 평균 대비 싼 순으로 추천
    @Test
    void buyQuestionPicksMedianListingAndRecommendsCheaperOnes() {
        interpret(AiChatIntent.BUY, "아이폰 13 미니");
        searchReturns(
                listing(1L, "아이폰 13 미니 리퍼 풀세트", 900_000L, null),
                listing(2L, "[구함] 아이폰 13 미니", 300_000L, null),
                listing(3L, "아이폰 13 미니 핑크", 1_004L, null),
                listing(4L, "아이폰 13 미니 블루", 310_000L, AnalysisRecommendation.BUY),
                listing(5L, "아이폰 13 미니 화이트", 300_000L, null),
                listing(6L, "아이폰 13 미니 128", 250_000L, null));
        ProductAnalysisResponse analysis = analysis(AnalysisRecommendation.BUY, 320_000L, "평균보다 저렴해요. 지금 사세요.");
        when(productAnalysisService.getLatestAnalysis(4L, AnalysisPerspective.BUY))
                .thenReturn(analysis);
        when(aiChatExecutor.call(eq("AI 대화 답변 작성"), any())).thenReturn(" 지금 사기 좋아요. ");

        Answer answer = service.answer(MEMBER_ID, "아이폰 13 미니 사도 돼?", List.of());

        assertThat(answer.content()).isEqualTo("지금 사기 좋아요.");
        assertThat(answer.intent()).isEqualTo(AiChatIntent.BUY);
        AnalysisCard card = answer.payload().analysis();
        assertThat(card.productId()).isEqualTo(4L);
        assertThat(card.mine()).isFalse();
        assertThat(card.recommendation()).isEqualTo(AnalysisRecommendation.BUY);
        assertThat(card.reason()).isEqualTo("평균보다 저렴해요.");
        assertThat(answer.payload().recommendedProducts())
                .extracting(RecommendedProduct::id)
                .containsExactly(6L, 5L, 1L);
        RecommendedProduct cheapest = answer.payload().recommendedProducts().get(0);
        assertThat(cheapest.averagePrice()).isEqualTo(320_000L);
        assertThat(cheapest.priceDiffRate()).isEqualByComparingTo(new BigDecimal("-21.9"));
        assertThat(cheapest.platformName()).isEqualTo("번개장터");
        verify(analysisRequestService, never()).request(anyLong());
    }

    // 팔기 질문 — 본인 판매 상품이 있으면 판매자 관점으로 분석
    @Test
    void sellQuestionUsesOwnProductWithSellerPerspective() {
        interpret(AiChatIntent.SELL, "필름카메라");
        searchReturns(listing(10L, "필름카메라 FM2", 200_000L, null));
        when(productService.getMyProducts(eq(MEMBER_ID), isNull(), eq("필름카메라"), any(), isNull(), anyInt()))
                .thenReturn(CursorPageResponse.of(List.of(myProduct(99L, "내 필름카메라", 250_000L)), 5, p -> p.id()));
        ProductAnalysisResponse analysis = analysis(AnalysisRecommendation.SELL, 230_000L, "지금 팔기 좋아요.");
        when(productAnalysisService.getLatestAnalysis(99L, AnalysisPerspective.SELL))
                .thenReturn(analysis);
        when(aiChatExecutor.call(eq("AI 대화 답변 작성"), any())).thenReturn("팔아도 좋아요.");

        Answer answer = service.answer(MEMBER_ID, "필름카메라 지금 팔까?", List.of());

        AnalysisCard card = answer.payload().analysis();
        assertThat(card.productId()).isEqualTo(99L);
        assertThat(card.source()).isEqualTo(ListingSource.OUR);
        assertThat(card.mine()).isTrue();
        assertThat(card.recommendation()).isEqualTo(AnalysisRecommendation.SELL);
        assertThat(answer.payload().recommendedProducts())
                .extracting(RecommendedProduct::id)
                .containsExactly(10L);
    }

    // 분석 결과가 없으면 분석을 요청하고 카드는 "분석 중", AI 문장 실패 시 고정 문장
    @Test
    void requestsAnalysisWhenMissingAndFallsBackToFixedText() {
        interpret(AiChatIntent.PRICE, "아이패드");
        searchReturns(listing(20L, "아이패드 9세대", 300_000L, null));
        ProductAnalysisResponse empty = analysis(null, null, "");
        when(empty.analysisStatus()).thenReturn(AnalysisStatus.NOT_ANALYZED);
        when(productAnalysisService.getLatestAnalysis(20L, AnalysisPerspective.BUY))
                .thenReturn(empty);
        when(analysisRequestService.request(20L))
                .thenReturn(new AnalysisRequestResponse(20L, AnalysisStatus.ANALYZING, null, null));
        when(aiChatExecutor.call(eq("AI 대화 답변 작성"), any())).thenThrow(new IllegalStateException("AI down"));

        Answer answer = service.answer(MEMBER_ID, "아이패드 시세 어때?", List.of());

        AnalysisCard card = answer.payload().analysis();
        assertThat(card.recommendation()).isNull();
        assertThat(card.analysisStatus()).isEqualTo(AnalysisStatus.ANALYZING);
        assertThat(answer.content()).contains("아이패드 시세를 정리했어요.", "300,000원", "시세를 분석하고 있어요");
    }

    // 상품을 못 찾은 질문 — 검색 없이 안내 문장, 카드 없음
    @Test
    void unknownQuestionAnswersWithoutCards() {
        when(interpreter.interpret(anyString(), any()))
                .thenReturn(new Interpretation(true, AiChatIntent.UNKNOWN, ProductSearchCondition.ofKeyword(null)));

        Answer answer = service.answer(MEMBER_ID, "안녕?", List.of());

        assertThat(answer.intent()).isEqualTo(AiChatIntent.UNKNOWN);
        assertThat(answer.payload()).isNull();
        verify(productService, never()).getProducts(any(), any(), any(), anyInt());
    }

    // 스트림 — 단계 시작·완료, 매물 찾기 결과(카드), 답변 문장 조각을 차례로 알림
    @Test
    void streamingAnswerReportsStepsCardsAndChunks() {
        interpret(AiChatIntent.BUY, "아이폰 13 미니");
        searchReturns(listing(4L, "아이폰 13 미니 블루", 310_000L, AnalysisRecommendation.BUY));
        ProductAnalysisResponse analysis = analysis(AnalysisRecommendation.BUY, 320_000L, "평균보다 저렴해요.");
        when(productAnalysisService.getLatestAnalysis(4L, AnalysisPerspective.BUY))
                .thenReturn(analysis);
        when(aiChatExecutor.stream(eq("AI 대화 답변 작성"), any(), any())).thenAnswer(invocation -> {
            Consumer<String> onChunk = invocation.getArgument(2);
            onChunk.accept(" 지금 ");
            onChunk.accept("사기 좋아요. ");
            return " 지금 사기 좋아요. ";
        });
        RecordingProgress progress = new RecordingProgress();

        Answer answer = service.answer(MEMBER_ID, "아이폰 13 미니 사도 돼?", List.of(), progress);

        assertThat(answer.content()).isEqualTo("지금 사기 좋아요.");
        assertThat(progress.events)
                .containsExactly(
                        "START:INTERPRET",
                        "DONE:INTERPRET",
                        "START:SEARCH",
                        "DONE:SEARCH:4",
                        "START:WRITE",
                        "DELTA: 지금 ",
                        "DELTA:사기 좋아요. ",
                        "DONE:WRITE");
        verify(aiChatExecutor, never()).call(eq("AI 대화 답변 작성"), any());
    }

    // 스트림 — 문장 AI가 조각 없이 실패하면 고정 문장을 한 조각으로 보냄
    @Test
    void streamingAnswerSendsFallbackTextWhenAiFails() {
        interpret(AiChatIntent.PRICE, "아이패드");
        searchReturns(listing(20L, "아이패드 프로", 300_000L, AnalysisRecommendation.BUY));
        ProductAnalysisResponse analysis = analysis(AnalysisRecommendation.BUY, 300_000L, "평균이에요.");
        when(productAnalysisService.getLatestAnalysis(20L, AnalysisPerspective.BUY))
                .thenReturn(analysis);
        when(aiChatExecutor.stream(eq("AI 대화 답변 작성"), any(), any())).thenThrow(new IllegalStateException("AI down"));
        RecordingProgress progress = new RecordingProgress();

        Answer answer = service.answer(MEMBER_ID, "아이패드 시세 어때?", List.of(), progress);

        assertThat(progress.events).contains("DELTA:" + answer.content());
        assertThat(answer.content()).contains("300,000원");
    }

    // 스트림 — 상품과 무관한 질문은 매물 찾기를 건너뛰고 안내 문장을 한 조각으로 보냄
    @Test
    void streamingUnknownQuestionSkipsSearch() {
        when(interpreter.interpret(anyString(), any()))
                .thenReturn(new Interpretation(true, AiChatIntent.UNKNOWN, ProductSearchCondition.ofKeyword(null)));
        RecordingProgress progress = new RecordingProgress();

        Answer answer = service.answer(MEMBER_ID, "안녕?", List.of(), progress);

        assertThat(progress.events)
                .containsExactly(
                        "START:INTERPRET",
                        "DONE:INTERPRET",
                        "SKIP:SEARCH",
                        "START:WRITE",
                        "DELTA:" + answer.content(),
                        "DONE:WRITE");
    }

    /** 받은 진행 상황을 문자열로 기록한다(매물 찾기 결과는 카드 상품 ID만). */
    private static final class RecordingProgress implements AiChatProgress {

        private final List<String> events = new ArrayList<>();

        @Override
        public void started(AiChatStep step) {
            events.add("START:" + step);
        }

        @Override
        public void done(AiChatStep step, Object result) {
            events.add(
                    result instanceof AiChatStreamEvent.SearchResult search
                            ? "DONE:" + step + ":" + search.analysis().productId()
                            : "DONE:" + step);
        }

        @Override
        public void skipped(AiChatStep step) {
            events.add("SKIP:" + step);
        }

        @Override
        public void delta(String text) {
            events.add("DELTA:" + text);
        }

        @Override
        public boolean streamsText() {
            return true;
        }
    }

    @Test
    void diffRateRoundsToOneDecimal() {
        assertThat(AiChatAnswerService.diffRate(270_000L, 402_857L)).isEqualByComparingTo(new BigDecimal("-33.0"));
        assertThat(AiChatAnswerService.diffRate(100L, 0L)).isNull();
    }

    private void interpret(AiChatIntent intent, String keyword) {
        when(interpreter.interpret(anyString(), any()))
                .thenReturn(new Interpretation(true, intent, ProductSearchCondition.ofKeyword(keyword)));
    }

    private void searchReturns(ProductListItemResponse... items) {
        when(productService.getProducts(eq(MEMBER_ID), any(), isNull(), eq(AiChatAnswerService.SEARCH_SIZE)))
                .thenReturn(CursorPageResponse.of(List.of(items), 100, ProductListItemResponse::id));
        when(productService.getMyProducts(eq(MEMBER_ID), any(), any(), any(), any(), anyInt()))
                .thenReturn(CursorPageResponse.of(List.of(), 5, ProductSummaryResponse::id));
    }

    private static ProductListItemResponse listing(
            Long id, String title, Long price, AnalysisRecommendation recommendation) {
        return new ProductListItemResponse(
                ListingSource.EXTERNAL,
                id,
                title,
                null,
                price,
                ProductStatus.ON_SALE.name(),
                null,
                null,
                null,
                "휴대폰",
                null,
                true,
                null,
                recommendation,
                null,
                "번개장터",
                "https://example.com/" + id,
                LocalDateTime.now(),
                false,
                null);
    }

    private static ProductSummaryResponse myProduct(Long id, String title, Long price) {
        return new ProductSummaryResponse(
                id,
                title,
                null,
                price,
                null,
                null,
                ProductStatus.ON_SALE,
                null,
                null,
                null,
                "카메라",
                null,
                null,
                null,
                LocalDateTime.now(),
                false,
                null);
    }

    private static ProductAnalysisResponse analysis(
            AnalysisRecommendation recommendation, Long averagePrice, String description) {
        ProductAnalysisResponse analysis = mock(ProductAnalysisResponse.class);
        when(analysis.recommendation()).thenReturn(recommendation);
        when(analysis.averagePrice()).thenReturn(averagePrice);
        when(analysis.description()).thenReturn(description);
        when(analysis.analysisStatus()).thenReturn(AnalysisStatus.ANALYZED);
        return analysis;
    }
}
