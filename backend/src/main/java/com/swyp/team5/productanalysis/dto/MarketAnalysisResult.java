package com.swyp.team5.productanalysis.dto;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;

/** Gemini에게 시세 분석을 요청했을 때 받는 구조화된 응답. */
public record MarketAnalysisResult(
        @JsonPropertyDescription("SELL(지금 팔기 좋은 타이밍)/HOLD(판매 보류 권장)/BUY(시세 대비 저렴해 지금 사기 좋음)/WAIT(구매 보류 권장) 중 하나")
                AnalysisRecommendation recommendation,
        @JsonPropertyDescription("비교 매물 시세를 참고해 원화(KRW) 기준으로 추정한 이 상품의 적정 거래가") Long suggestedPrice,
        @JsonPropertyDescription("판단 근거를 1~2문장으로 설명") String description) {}
