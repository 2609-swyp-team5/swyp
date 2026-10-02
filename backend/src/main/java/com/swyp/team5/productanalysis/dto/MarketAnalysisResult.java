package com.swyp.team5.productanalysis.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;

/**
 * AI(Gemini, 실패 시 OpenAI GPT)에게 시세 분석을 요청했을 때 받는 구조화된 응답. 우리 상품은 {@code recommendation}이 판매자
 * 관점(SELL/HOLD), {@code buyerRecommendation}이 구매자 관점(BUY/WAIT)이고, 외부 매물은 {@code recommendation}만 구매자
 * 관점으로 채운다. 최종 추천은 {@code RecommendationRule}이 정한다(AI 추천이 다르면 근거 문장도 규칙 기반으로 바뀜).
 */
public record MarketAnalysisResult(
        @JsonPropertyDescription("후보 매물 중 분석 대상 상품과 같은 물건(같은 종류·모델)인 매물의 번호 목록. 없으면 빈 배열")
                List<Integer> similarListingNumbers,
        @JsonPropertyDescription("SELL(지금 팔기 좋은 타이밍)/HOLD(판매 보류 권장)/BUY(시세 대비 저렴해 지금 사기 좋음)/WAIT(구매 보류 권장) 중 하나")
                AnalysisRecommendation recommendation,
        @JsonPropertyDescription("같은 물건으로 고른 매물 시세를 참고해 원화(KRW) 기준으로 추정한 이 상품의 적정 거래가") Long suggestedPrice,
        @JsonPropertyDescription("recommendation의 판단 근거를 1~2문장으로 설명") String description,
        @JsonPropertyDescription("구매자 관점 추천 BUY/WAIT. 지시가 없으면 null") AnalysisRecommendation buyerRecommendation,
        @JsonPropertyDescription("buyerRecommendation의 판단 근거를 1~2문장으로 설명. 지시가 없으면 null") String buyerDescription) {

    /** 구매자 관점 추천이 없는 응답(외부 매물 분석). */
    public MarketAnalysisResult(
            List<Integer> similarListingNumbers,
            AnalysisRecommendation recommendation,
            Long suggestedPrice,
            String description) {
        this(similarListingNumbers, recommendation, suggestedPrice, description, null, null);
    }
}
