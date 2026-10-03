package com.swyp.team5.product.service;

import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;

import com.swyp.team5.common.ai.AiChatExecutor;
import com.swyp.team5.product.dto.ProductAiSearchCondition;
import com.swyp.team5.product.dto.ProductSearchCondition;

/**
 * 자연어 검색 문장을 AI(Gemini, 실패 시 OpenAI GPT)로 해석해 상품 목록 조회(통합 검색) 조건으로 바꾸는 서비스.
 * 두 모델 모두 실패하면 문장 전체를 키워드로 쓰는 조건으로 대체한다(검색 자체는 실패시키지 않음).
 */
@Slf4j
@Service
public class ProductAiSearchService {

    private static final String SYSTEM_PROMPT =
            """
            너는 중고거래 통합 검색의 검색어 해석기야. 사용자가 쓴 문장을 읽고 검색 조건만 뽑아.
            - keyword: 찾는 상품의 핵심 검색어. 상품명·브랜드·모델명 위주로 짧게(예: "아이폰 15 프로").
              가격·상태·정렬 같은 조건 표현이나 "사고 싶어", "찾아줘" 같은 말은 넣지 마. 찾는 상품이 없으면 null.
            - excludeKeywords: "~ 빼고", "~ 말고", "~ 제외"처럼 결과에서 빼달라는 단어(없으면 빈 배열).
            - minPrice / maxPrice: 원 단위 정수("50만원 이하" → maxPrice 500000, "10~20만원" → 100000~200000).
              언급이 없으면 null.
            - tradeStatuses: 거래 상태 SELLING(판매중)/RESERVED(예약중)/SOLD_OUT(판매완료). 언급이 없으면 빈 배열.
            - platforms: OUR(우리 서비스 직접 등록 상품)/BUNJANG(번개장터). 언급이 없으면 빈 배열.
            - conditions: 상품 상태 등급 S(새 상품·미개봉)/A(사용감 거의 없음)/B(사용감 적음)/C(사용감 있음)/D(사용감 많음).
              "새거", "미개봉" → S, "깨끗한", "상태 좋은" → S와 A처럼 해당 등급을 모두 넣어. 언급이 없으면 빈 배열.
            - defectStatuses: 하자 여부 NORMAL(하자 없음)/ISSUES(하자 있음)/UNKNOWN(모름).
              "하자 없는", "고장 없는" → NORMAL. 언급이 없으면 빈 배열.
            - sort: RECOMMENDED(추천순)/LATEST(최신순)/INTEREST(인기·관심 많은 순)/PRICE_HIGH(비싼 순)/PRICE_LOW(싼 순·최저가).
              언급이 없으면 null.
            문장에 없는 조건을 추측해서 채우지 마.
            """;

    private final AiChatExecutor aiChatExecutor;

    public ProductAiSearchService(AiChatExecutor aiChatExecutor) {
        this.aiChatExecutor = aiChatExecutor;
    }

    /**
     * 자연어 검색 문장을 검색 조건으로 해석한다.
     *
     * @param query 사용자가 입력한 검색 문장
     * @return 해석 결과(AI 실패 시 문장 전체를 키워드로 쓰는 조건, {@link Interpretation#aiApplied()} false)
     */
    public Interpretation interpret(String query) {
        String trimmed = query.strip();
        try {
            ProductAiSearchCondition result = aiChatExecutor.call("AI 상품 검색어 해석", client -> client.prompt()
                    .system(SYSTEM_PROMPT)
                    .user(trimmed)
                    .call()
                    .entity(ProductAiSearchCondition.class));
            return new Interpretation(true, toSearchCondition(Objects.requireNonNull(result)));
        } catch (RuntimeException e) {
            log.warn("AI 상품 검색어 해석 실패, 문장 전체를 키워드로 검색합니다. 원인: {}", e.toString());
            return new Interpretation(false, ProductSearchCondition.ofKeyword(trimmed));
        }
    }

    // AI 값은 그대로 믿지 않는다 — 음수 가격은 버리고, 최소·최대가 뒤바뀌면 맞바꾼다(검색 조건 생성자가 400을 던지지 않게)
    private static ProductSearchCondition toSearchCondition(ProductAiSearchCondition result) {
        Long minPrice = nonNegative(result.minPrice());
        Long maxPrice = nonNegative(result.maxPrice());
        if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
            Long swap = minPrice;
            minPrice = maxPrice;
            maxPrice = swap;
        }
        List<String> excludeKeywords = result.excludeKeywords() == null
                ? List.of()
                : ProductSearchCondition.splitExcludeKeywords(String.join(" ", result.excludeKeywords()));
        return new ProductSearchCondition(
                result.keyword(),
                excludeKeywords,
                null,
                toSet(result.tradeStatuses()),
                toSet(result.platforms()),
                minPrice,
                maxPrice,
                toSet(result.conditions()),
                toSet(result.defectStatuses()),
                result.sort());
    }

    private static Long nonNegative(Long price) {
        return price == null || price < 0 ? null : price;
    }

    private static <E extends Enum<E>> Set<E> toSet(List<E> values) {
        if (values == null) {
            return null;
        }
        List<E> present = values.stream().filter(Objects::nonNull).toList();
        return present.isEmpty() ? null : EnumSet.copyOf(present);
    }

    /**
     * @param aiApplied AI가 문장을 해석했는지
     * @param condition 검색 조건
     */
    public record Interpretation(boolean aiApplied, ProductSearchCondition condition) {}
}
