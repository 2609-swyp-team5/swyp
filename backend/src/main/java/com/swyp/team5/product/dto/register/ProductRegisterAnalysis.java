package com.swyp.team5.product.dto.register;

import java.util.List;

import com.swyp.team5.product.dto.ProductResponse;
import com.swyp.team5.product.dto.register.ProductRegisterStepEvent.ImageAnalysisResult;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;

/**
 * 단계별 스트리밍 등록·수정(SSE) 최종 응답 {@code data.analysis} 필드. 등록 시점의 가격·분석 정보를 한곳에 모은다.
 *
 * <p>{@code categoryId}/{@code title}/{@code brand}/{@code condition}은 AI가 사진에서 추론한 값이다. AI 등록은 상품 값과
 * 같고, 직접 등록·수정은 사용자 입력이 우선이라 상품에 저장되지 않은 AI 추론값을 여기서 확인할 수 있다. 분석을
 * 건너뛰었으면({@code SKIP} — 수정에서 이미지가 그대로이거나 재분석에 실패한 경우) 모두 null이다.
 *
 * @param status AI 사진 분석 결과({@code DONE} 성공 / {@code SKIP} 건너뜀 — 수정만)
 * @param categoryId AI가 추론한 카테고리 ID
 * @param title AI가 추론한 상품 제목
 * @param brand AI가 식별한 브랜드(식별 불가 시 null)
 * @param condition AI가 판단한 상품 상태 등급
 * @param suggestedPrice AI 제안가(저장값)
 * @param analysisDescription AI 판단 근거(상태 등급·제안가 근거, 저장값)
 * @param marketAveragePrice 비교 매물(수집 데이터) 평균가(AI 제안가와 별개, 비교 매물이 3건 미만이면 null)
 * @param recommendation 시세 분석 판단(SELL/HOLD/BUY/WAIT). 정기 시세 분석 전이라 등록 직후에는 항상 null
 */
public record ProductRegisterAnalysis(
        String status,
        Long categoryId,
        String title,
        String brand,
        ProductCondition condition,
        Long suggestedPrice,
        String analysisDescription,
        Long marketAveragePrice,
        AnalysisRecommendation recommendation) {

    /**
     * 등록된 상품과 AI 사진 분석 단계 결과로 만든다.
     *
     * @param product 등록된 상품
     * @param steps 단계별 최종 결과(AI 사진 분석 단계가 없으면 status와 AI 추론값은 null)
     */
    public static ProductRegisterAnalysis of(ProductResponse product, List<ProductRegisterStepEvent> steps) {
        ProductRegisterStepEvent analysisStep = steps.stream()
                .filter(event -> event.step() == ProductRegisterStep.IMAGE_ANALYSIS)
                .findFirst()
                .orElse(null);
        ImageAnalysisResult ai =
                analysisStep != null && analysisStep.result() instanceof ImageAnalysisResult result ? result : null;
        return new ProductRegisterAnalysis(
                analysisStep == null ? null : analysisStep.status(),
                ai == null ? null : ai.categoryId(),
                ai == null ? null : ai.title(),
                ai == null ? null : ai.brand(),
                ai == null ? null : ai.condition(),
                product.suggestedPrice(),
                product.analysisDescription(),
                product.marketAveragePrice(),
                product.recommendation());
    }
}
