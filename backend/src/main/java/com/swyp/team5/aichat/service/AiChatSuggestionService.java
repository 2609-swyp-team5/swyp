package com.swyp.team5.aichat.service;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import com.swyp.team5.aichat.dto.AiChatSuggestionResponse;
import com.swyp.team5.aichat.dto.AiChatSuggestionResponse.Source;
import com.swyp.team5.aichat.entity.AiChatIntent;
import com.swyp.team5.interest.dto.InterestListItemResponse;
import com.swyp.team5.interest.service.InterestService;
import com.swyp.team5.product.dto.ProductSummaryResponse;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.service.ProductService;
import com.swyp.team5.search.service.SearchLogService;

/**
 * 지금이니 AI 추천 질문을 만든다. AI를 부르지 않고 틀에 상품 이름을 넣는다 — 내 판매 상품은 팔기, 관심상품은 사기, 인기 검색어는
 * 시세·사기·팔기를 번갈아 묻는다. 같은 상품 이름은 한 번만 넣고, 재료가 없으면 기본 질문으로 채운다.
 */
@Service
public class AiChatSuggestionService {

    static final int MAX_PER_PERSONAL_SOURCE = 2;
    static final int KEYWORD_MAX_LENGTH = 20;
    private static final int KEYWORD_MAX_WORDS = 4;
    private static final Pattern BRACKETS = Pattern.compile("\\[[^]]*]|\\([^)]*\\)|【[^】]*】");
    private static final Pattern CUT_MARKS = Pattern.compile("[,/+|·]");
    private static final List<String> DEFAULT_KEYWORDS = List.of("아이폰", "아이패드", "닌텐도 스위치", "에어팟", "갤럭시");

    private final ProductService productService;
    private final InterestService interestService;
    private final SearchLogService searchLogService;

    public AiChatSuggestionService(
            ProductService productService, InterestService interestService, SearchLogService searchLogService) {
        this.productService = productService;
        this.interestService = interestService;
        this.searchLogService = searchLogService;
    }

    /**
     * @param memberId 요청 회원 ID
     * @param size 최대 개수
     * @return 내 판매 상품(최대 2) → 관심상품(최대 2) → 인기 검색어 → 기본 질문 순으로 채운 추천 질문
     */
    public List<AiChatSuggestionResponse> getSuggestions(Long memberId, int size) {
        Map<String, AiChatSuggestionResponse> byKeyword = new LinkedHashMap<>();

        List<ProductSummaryResponse> mine = productService
                .getMyProducts(
                        memberId, null, null, EnumSet.of(ProductStatus.ON_SALE, ProductStatus.RESERVED), null, 10)
                .content();
        addFrom(byKeyword, mine.stream().map(ProductSummaryResponse::title).toList(), Source.MY_PRODUCT, size);

        List<InterestListItemResponse> interests =
                interestService.getInterests(memberId, null, null, 20).content();
        addFrom(
                byKeyword,
                interests.stream()
                        .filter(item -> ProductStatus.ON_SALE.name().equals(item.status()))
                        .map(InterestListItemResponse::title)
                        .toList(),
                Source.INTEREST,
                size);

        addFrom(byKeyword, searchLogService.getPopularKeywords(), Source.TRENDING, size);
        addFrom(byKeyword, DEFAULT_KEYWORDS, Source.DEFAULT, size);
        return new ArrayList<>(byKeyword.values());
    }

    private static void addFrom(
            Map<String, AiChatSuggestionResponse> byKeyword, List<String> names, Source source, int size) {
        int limit =
                source == Source.MY_PRODUCT || source == Source.INTEREST ? MAX_PER_PERSONAL_SOURCE : Integer.MAX_VALUE;
        int added = 0;
        for (String name : names) {
            if (byKeyword.size() >= size || added >= limit) {
                return;
            }
            String keyword = shorten(name);
            if (keyword.isEmpty() || byKeyword.containsKey(keyword)) {
                continue;
            }
            byKeyword.put(keyword, suggestion(keyword, source, added));
            added++;
        }
    }

    private static AiChatSuggestionResponse suggestion(String keyword, Source source, int order) {
        AiChatIntent intent =
                switch (source) {
                    case MY_PRODUCT -> AiChatIntent.SELL;
                    case INTEREST -> AiChatIntent.BUY;
                        // 인기 검색어·기본 질문은 재료 안에서 시세 → 사기 → 팔기를 번갈아 물어 칩이 한쪽으로 쏠리지 않게 한다
                    case TRENDING, DEFAULT -> List.of(AiChatIntent.PRICE, AiChatIntent.BUY, AiChatIntent.SELL)
                            .get(order % 3);
                };
        String question =
                switch (intent) {
                    case SELL -> keyword + " 지금 팔면 얼마 받을까?";
                    case BUY -> keyword + " 지금 사도 될까?";
                    default -> keyword + " 지금 얼마야?";
                };
        return new AiChatSuggestionResponse(question, intent, keyword, source);
    }

    /** 상품 제목을 질문에 넣기 좋게 줄인다 — 괄호 내용·쉼표 뒤를 버리고 앞 4단어, 최대 20자(단어 단위). */
    static String shorten(String title) {
        if (title == null) {
            return "";
        }
        String cleaned = BRACKETS.matcher(title).replaceAll(" ");
        cleaned = CUT_MARKS.split(cleaned, 2)[0].replaceAll("\\s+", " ").strip();
        StringBuilder builder = new StringBuilder();
        String[] words = cleaned.split(" ");
        for (int i = 0; i < words.length && i < KEYWORD_MAX_WORDS; i++) {
            String next = builder.isEmpty() ? words[i] : builder + " " + words[i];
            if (next.length() > KEYWORD_MAX_LENGTH) {
                break;
            }
            builder.setLength(0);
            builder.append(next);
        }
        if (builder.isEmpty() && !cleaned.isEmpty()) {
            return cleaned.substring(0, Math.min(KEYWORD_MAX_LENGTH, cleaned.length()));
        }
        return builder.toString();
    }
}
