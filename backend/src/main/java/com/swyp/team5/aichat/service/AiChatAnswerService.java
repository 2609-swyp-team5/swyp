package com.swyp.team5.aichat.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;

import com.swyp.team5.aichat.entity.AiChatIntent;
import com.swyp.team5.aichat.entity.AiChatPayload;
import com.swyp.team5.aichat.entity.AiChatPayload.AnalysisCard;
import com.swyp.team5.aichat.entity.AiChatPayload.RecommendedProduct;
import com.swyp.team5.aichat.service.AiChatQuestionInterpreter.Interpretation;
import com.swyp.team5.aichat.service.AiChatQuestionInterpreter.Turn;
import com.swyp.team5.common.ai.AiChatExecutor;
import com.swyp.team5.item.entity.ListingSource;
import com.swyp.team5.product.dto.ProductListItemResponse;
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

/**
 * 지금이니 AI 답변을 만든다. AI가 숫자를 지어내지 않도록 근거 데이터를 먼저 모으고, AI에게는 그 숫자로 설명 문장만 쓰게 한다.
 *
 * <ol>
 *   <li>질문 해석 — 의도(팔기/사기/시세)와 매물 검색 조건({@link AiChatQuestionInterpreter}, AI 1회)
 *   <li>대상 찾기 — 팔기면 본인 판매 상품 중 키워드가 맞는 것, 아니면 판매중 매물 중 가격이 중앙값에 가까운 것(분석된 매물 우선)
 *   <li>시세 근거 — 대상의 최신 분석(본인 상품은 판매자, 그 밖은 구매자 관점). 없으면 분석을 요청하고 카드는 "분석 중"으로 둔다
 *   <li>추천 상품 — 판매중 매물 중 평균 시세보다 싼 순(구함·매입 글, 중앙값의 20% 미만 낚시 가격 제외)
 *   <li>설명 문장 — 위 숫자만 넣어 AI가 작성(AI 1회). 실패하면 숫자로 만든 고정 문장
 * </ol>
 *
 * <p>DB 트랜잭션 밖에서 호출한다(AI 응답을 기다리는 동안 커넥션을 잡지 않도록).
 */
@Slf4j
@Service
public class AiChatAnswerService {

    static final int SEARCH_SIZE = 30;
    static final int RECOMMENDED_LIMIT = 6;
    private static final int MY_PRODUCT_LIMIT = 5;
    private static final int TARGET_CANDIDATES = 5;
    private static final double BAIT_PRICE_RATIO = 0.2;
    private static final Pattern WANTED_TITLE = Pattern.compile("구함|구해요|구합니다|삽니다|매입");

    private static final String ANSWER_PROMPT =
            """
            너는 중고거래 시세 도우미 "지금이니 AI"야. 사용자의 질문에 [근거]만 써서 답해.
            - [근거]에 없는 숫자·모델·시장 동향을 지어내지 마. 근거가 부족하면 부족하다고 말해.
            - 3~4문장, 존댓말(~요). 첫 문장에 질문에 대한 결론(팔기/기다리기/사기/기다리기 등)을 말해.
            - 시세를 말할 때는 "분석 평균 시세"(없으면 "판매중 매물의 보통 가격")를 써. "판단 근거" 문장 속 금액은 기준이 달라
              인용하지 마.
            - "중앙값", "분석 대상" 같은 내부 용어 대신 "판매중 매물은 보통 ~원", "비슷한 매물"처럼 쉬운 말로 써.
            - 금액은 "312,000원"처럼 쉼표와 원으로 써.
            - 목록·마크다운·이모지는 쓰지 마.
            """;

    private static final Map<AnalysisRecommendation, String> RECOMMENDATION_TEXT = Map.of(
            AnalysisRecommendation.SELL, "지금 팔기 좋아요",
            AnalysisRecommendation.HOLD, "조금 더 기다려 보세요",
            AnalysisRecommendation.BUY, "지금 사기 좋아요",
            AnalysisRecommendation.WAIT, "곧 사기 좋은 타이밍이 올 수 있어요");

    private final AiChatQuestionInterpreter interpreter;
    private final ProductService productService;
    private final ProductAnalysisService productAnalysisService;
    private final AnalysisRequestService analysisRequestService;
    private final AiChatExecutor aiChatExecutor;

    public AiChatAnswerService(
            AiChatQuestionInterpreter interpreter,
            ProductService productService,
            ProductAnalysisService productAnalysisService,
            AnalysisRequestService analysisRequestService,
            AiChatExecutor aiChatExecutor) {
        this.interpreter = interpreter;
        this.productService = productService;
        this.productAnalysisService = productAnalysisService;
        this.analysisRequestService = analysisRequestService;
        this.aiChatExecutor = aiChatExecutor;
    }

    /**
     * @param memberId 질문한 회원 ID(본인 판매 상품 찾기·검색 기록용)
     * @param question 이번 질문
     * @param history 이전 질문·답변(오래된 순, 최근 몇 개만)
     */
    public Answer answer(Long memberId, String question, List<Turn> history) {
        Interpretation interpretation = interpreter.interpret(question, history);
        AiChatIntent intent = interpretation.intent();
        String keyword = interpretation.condition().keyword();
        if (intent == AiChatIntent.UNKNOWN || keyword == null) {
            return new Answer(unknownText(), AiChatIntent.UNKNOWN, null);
        }

        List<ProductListItemResponse> listings = saleListings(productService
                .getProducts(memberId, interpretation.condition(), null, SEARCH_SIZE)
                .content());
        Long medianPrice = median(listings);

        AnalysisCard card = intent == AiChatIntent.SELL ? myProductCard(memberId, keyword) : null;
        if (card == null) {
            card = listingCard(listings, medianPrice);
        }
        Long baseAverage = card != null && card.averagePrice() != null ? card.averagePrice() : medianPrice;
        List<RecommendedProduct> recommended = recommend(listings, card, baseAverage);
        AiChatPayload payload = new AiChatPayload(card, recommended);

        Facts facts = new Facts(intent, keyword, listings.size(), medianPrice, card, recommended);
        return new Answer(write(question, history, facts), intent, payload);
    }

    private AnalysisCard myProductCard(Long memberId, String keyword) {
        List<ProductSummaryResponse> mine = productService
                .getMyProducts(
                        memberId,
                        null,
                        keyword,
                        EnumSet.of(ProductStatus.ON_SALE, ProductStatus.DRAFT, ProductStatus.RESERVED),
                        null,
                        MY_PRODUCT_LIMIT)
                .content();
        if (mine.isEmpty()) {
            return null;
        }
        ProductSummaryResponse product = mine.get(0);
        return analysisCard(product.id(), ListingSource.OUR, true, product.title(), product.price());
    }

    // 검색 첫 결과는 리퍼·세트 같은 이상치일 수 있어, 가격이 중앙값에 가까운 매물 몇 개 중 이미 분석된 것을 먼저 고른다
    private AnalysisCard listingCard(List<ProductListItemResponse> listings, Long medianPrice) {
        if (listings.isEmpty()) {
            return null;
        }
        List<ProductListItemResponse> near = listings.stream()
                .sorted(Comparator.comparingLong(item -> Math.abs(item.price() - medianPrice)))
                .limit(TARGET_CANDIDATES)
                .toList();
        ProductListItemResponse target = near.stream()
                .filter(item -> item.recommendation() != null)
                .findFirst()
                .orElse(near.get(0));
        return analysisCard(target.id(), target.source(), false, target.title(), target.price());
    }

    private AnalysisCard analysisCard(Long id, ListingSource source, boolean mine, String title, Long price) {
        AnalysisPerspective perspective = mine ? AnalysisPerspective.SELL : AnalysisPerspective.BUY;
        ProductAnalysisResponse analysis = productAnalysisService.getLatestAnalysis(id, perspective);
        if (analysis.recommendation() != null) {
            return new AnalysisCard(
                    id,
                    source,
                    mine,
                    title,
                    price,
                    analysis.recommendation(),
                    firstSentence(analysis.description()),
                    analysis.averagePrice(),
                    analysis.analysisStatus());
        }
        AnalysisStatus status = analysis.analysisStatus();
        String reason = analysis.analysisSkipMessage();
        if (status != AnalysisStatus.ANALYZING && status != AnalysisStatus.UNAVAILABLE) {
            try {
                AnalysisRequestResponse requested = analysisRequestService.request(id);
                status = requested.analysisStatus();
                reason = requested.analysisSkipMessage();
            } catch (RuntimeException e) {
                log.warn("AI 대화 답변 중 시세 분석 요청 실패: itemId={}, 원인: {}", id, e.toString());
            }
        }
        if (status == AnalysisStatus.ANALYZING) {
            reason = "시세를 분석하고 있어요. 잠시 뒤 상세 분석에서 결과를 확인해 주세요.";
        }
        return new AnalysisCard(
                id,
                source,
                mine,
                title,
                price,
                null,
                reason == null ? "아직 시세 분석 결과가 없어요." : reason,
                analysis.averagePrice(),
                status);
    }

    private static List<RecommendedProduct> recommend(
            List<ProductListItemResponse> listings, AnalysisCard card, Long baseAverage) {
        List<RecommendedProduct> products = new ArrayList<>();
        for (ProductListItemResponse item : listings) {
            if (card != null
                    && !card.mine()
                    && item.source() == card.source()
                    && item.id().equals(card.productId())) {
                continue;
            }
            Long average = item.marketAveragePrice() != null ? item.marketAveragePrice() : baseAverage;
            products.add(new RecommendedProduct(
                    item.id(),
                    item.source(),
                    item.source() == ListingSource.OUR ? "지금이니" : item.platformName(),
                    item.thumbnailUrl(),
                    item.title(),
                    item.price(),
                    average,
                    diffRate(item.price(), average),
                    item.externalUrl()));
        }
        return products.stream()
                .sorted(Comparator.comparing(
                        RecommendedProduct::priceDiffRate, Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(RECOMMENDED_LIMIT)
                .toList();
    }

    private String write(String question, List<Turn> history, Facts facts) {
        try {
            String text = aiChatExecutor.call("AI 대화 답변 작성", client -> client.prompt()
                    .system(ANSWER_PROMPT)
                    .user(answerMessage(question, history, facts))
                    .call()
                    .content());
            if (text != null && !text.isBlank()) {
                return text.strip();
            }
        } catch (RuntimeException e) {
            log.warn("AI 대화 답변 작성 실패, 고정 문장으로 대체합니다. 원인: {}", e.toString());
        }
        return fallbackText(facts);
    }

    private static String answerMessage(String question, List<Turn> history, Facts facts) {
        StringBuilder builder = new StringBuilder();
        if (!history.isEmpty()) {
            builder.append("[이전 대화]\n");
            history.forEach(turn -> builder.append(turn.question() ? "질문: " : "답변: ")
                    .append(turn.content())
                    .append('\n'));
            builder.append('\n');
        }
        builder.append("[질문]\n").append(question).append("\n\n[근거]\n");
        builder.append("- 질문 의도: ").append(intentText(facts.intent())).append('\n');
        builder.append("- 찾은 상품: ").append(facts.keyword()).append('\n');
        builder.append("- 판매중 비교 매물 수: ").append(facts.listingCount()).append("건\n");
        if (facts.medianPrice() != null) {
            builder.append("- 판매중 매물의 보통 가격(중앙값): ")
                    .append(won(facts.medianPrice()))
                    .append('\n');
        }
        AnalysisCard card = facts.card();
        if (facts.intent() == AiChatIntent.SELL && (card == null || !card.mine())) {
            builder.append("- 질문한 회원의 판매 상품 중 맞는 상품: 없음(시장 매물로 대신 분석)\n");
        }
        if (card != null) {
            builder.append("- 분석 대상: ")
                    .append(card.title())
                    .append(card.mine() ? " (질문한 회원이 판매 중인 상품)" : " (시장 매물)")
                    .append(", 판매가 ")
                    .append(won(card.price()))
                    .append('\n');
            if (card.recommendation() != null) {
                builder.append(card.mine() ? "- AI 시세 분석 판단(판매자 관점): " : "- AI 시세 분석 판단(구매자 관점): ")
                        .append(RECOMMENDATION_TEXT.get(card.recommendation()))
                        .append(" (")
                        .append(card.recommendation())
                        .append(")\n");
                builder.append("- 판단 근거: ").append(card.reason()).append('\n');
            } else {
                builder.append("- 시세 분석 결과: 아직 없음 — ").append(card.reason()).append('\n');
            }
            if (card.averagePrice() != null) {
                builder.append("- 분석 평균 시세: ").append(won(card.averagePrice())).append('\n');
            }
        } else {
            builder.append("- 분석 대상: 맞는 매물을 찾지 못함\n");
        }
        if (!facts.recommended().isEmpty()) {
            RecommendedProduct cheapest = facts.recommended().get(0);
            builder.append("- 가장 저렴한 추천 매물: ")
                    .append(cheapest.title())
                    .append(", ")
                    .append(won(cheapest.price()))
                    .append('\n');
        }
        return builder.toString();
    }

    private static String fallbackText(Facts facts) {
        if (facts.listingCount() == 0 && facts.card() == null) {
            return "'" + facts.keyword() + "'에 맞는 판매중 매물을 찾지 못했어요. 상품명을 조금 더 구체적으로 적어 주세요.";
        }
        List<String> lines = new ArrayList<>();
        AnalysisCard card = facts.card();
        if (card != null && card.recommendation() != null) {
            lines.add(facts.keyword() + "에 대한 AI 판단은 '" + RECOMMENDATION_TEXT.get(card.recommendation()) + "'예요.");
            lines.add(card.reason());
        } else {
            lines.add(facts.keyword() + " 시세를 정리했어요.");
        }
        Long average = card != null && card.averagePrice() != null ? card.averagePrice() : facts.medianPrice();
        if (average != null) {
            lines.add("판매중인 매물 " + facts.listingCount() + "건 기준 시세는 약 " + won(average) + "이에요.");
        }
        if (card != null && card.recommendation() == null) {
            lines.add(card.reason());
        }
        return String.join("\n", lines);
    }

    private static String unknownText() {
        return "어떤 상품이 궁금한지 알려 주세요. 예를 들어 \"아이폰 13 미니 지금 팔아도 될까?\"처럼 상품명과 함께 물어보면 시세와 거래 타이밍을 알려드려요.";
    }

    // 판매중 매물만, 구함·매입 글과 중앙값의 20% 미만 가격(1,004원 같은 낚시 가격)은 뺀다
    static List<ProductListItemResponse> saleListings(List<ProductListItemResponse> items) {
        List<ProductListItemResponse> selling = items.stream()
                .filter(item -> ProductStatus.ON_SALE.name().equals(item.status()))
                .filter(item -> item.price() != null
                        && !WANTED_TITLE.matcher(item.title()).find())
                .toList();
        Long median = median(selling);
        if (median == null) {
            return selling;
        }
        return selling.stream()
                .filter(item -> item.price() >= median * BAIT_PRICE_RATIO)
                .toList();
    }

    static Long median(List<ProductListItemResponse> items) {
        List<Long> prices = items.stream()
                .map(ProductListItemResponse::price)
                .filter(Objects::nonNull)
                .sorted()
                .toList();
        return prices.isEmpty() ? null : prices.get(prices.size() / 2);
    }

    static BigDecimal diffRate(Long price, Long average) {
        if (price == null || average == null || average == 0) {
            return null;
        }
        return BigDecimal.valueOf(price - average)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(average), 1, RoundingMode.HALF_UP);
    }

    private static String firstSentence(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        int end = -1;
        for (String mark : List.of(". ", "다.", "요.")) {
            int index = text.indexOf(mark);
            if (index >= 0 && (end < 0 || index < end)) {
                end = index + (mark.equals(". ") ? 1 : mark.length());
            }
        }
        return (end > 0 ? text.substring(0, end) : text).strip();
    }

    private static String won(Long value) {
        return String.format("%,d원", value);
    }

    private static String intentText(AiChatIntent intent) {
        return switch (intent) {
            case SELL -> "팔기(판매 타이밍)";
            case BUY -> "사기(구매 타이밍)";
            case PRICE -> "시세 확인";
            case UNKNOWN -> "알 수 없음";
        };
    }

    private record Facts(
            AiChatIntent intent,
            String keyword,
            int listingCount,
            Long medianPrice,
            AnalysisCard card,
            List<RecommendedProduct> recommended) {}

    /**
     * @param content 답변 설명 문장
     * @param intent 질문 의도
     * @param payload 카드 데이터(상품과 무관한 질문이면 null)
     */
    public record Answer(String content, AiChatIntent intent, AiChatPayload payload) {}
}
