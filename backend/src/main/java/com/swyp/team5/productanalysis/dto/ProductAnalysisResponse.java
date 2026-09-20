package com.swyp.team5.productanalysis.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;

public record ProductAnalysisResponse(
        Long productId,
        Long analysisId, // 분석 이력이 없으면 null(아래 필드도 전부 null)
        Long minPrice,
        Long averagePrice,
        Long maxPrice,
        BigDecimal changeRate, // 직전 분석 대비 평균가 변동률, 직전 분석이 없으면 null
        AnalysisRecommendation recommendation,
        Long suggestedPrice,
        String description,
        LocalDateTime analyzedAt) {

    /** 아직 분석 이력이 없는 상품(분석 배치가 아직 돌지 않았거나, 비교 매물이 부족해 건너뛴 경우)에 사용한다. */
    public static ProductAnalysisResponse empty(Long productId) {
        return new ProductAnalysisResponse(productId, null, null, null, null, null, null, null, null, null);
    }

    public static ProductAnalysisResponse from(ProductAnalysis analysis) {
        return new ProductAnalysisResponse(
                analysis.getProduct().getId(),
                analysis.getId(),
                analysis.getMinPrice(),
                analysis.getAveragePrice(),
                analysis.getMaxPrice(),
                analysis.getChangeRate(),
                analysis.getRecommendation(),
                analysis.getSuggestedPrice(),
                analysis.getDescription(),
                analysis.getAnalyzedAt());
    }
}
