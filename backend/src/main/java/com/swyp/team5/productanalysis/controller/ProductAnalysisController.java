package com.swyp.team5.productanalysis.controller;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.productanalysis.dto.AnalysisPerspective;
import com.swyp.team5.productanalysis.dto.PriceTrendResponse;
import com.swyp.team5.productanalysis.dto.ProductAnalysisResponse;
import com.swyp.team5.productanalysis.dto.ProductForecastResponse;
import com.swyp.team5.productanalysis.service.ProductAnalysisService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "ProductAnalysis", description = "상품 시세 분석")
@RestController
@RequestMapping("/products/{productId}/analysis")
@RequiredArgsConstructor
@Validated
public class ProductAnalysisController {

    private final ProductAnalysisService productAnalysisService;

    /**
     * 상품의 가장 최근 시세 분석 결과를 조회한다.
     *
     * @param productId 조회할 상품 ID
     * @param perspective 조회 관점(SELL 기본 — 판매자 추천, BUY — 구매자 추천)
     * @return 200 OK + 시세 분석 결과(분석 이력이 없으면 필드가 전부 null)
     */
    @Operation(summary = "상품 시세 분석 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<ProductAnalysisResponse>> getAnalysis(
            @PathVariable Long productId, @RequestParam(defaultValue = "SELL") AnalysisPerspective perspective) {
        return ResponseEntity.ok(ApiResponse.success(productAnalysisService.getLatestAnalysis(productId, perspective)));
    }

    /**
     * 상품의 감가 예측(1M/3M/6M 예상 가격)을 조회한다. 가장 최근 시세 분석 때 함께 계산한 값이다.
     *
     * @param productId 조회할 상품 ID(외부 매물 ID 포함)
     * @return 200 OK + 감가 예측(분석 이력이 없으면 {@code forecasts}가 빈 배열)
     */
    @Operation(summary = "상품 감가 예측 조회")
    @GetMapping("/forecast")
    public ResponseEntity<ApiResponse<ProductForecastResponse>> getForecast(@PathVariable Long productId) {
        return ResponseEntity.ok(ApiResponse.success(productAnalysisService.getForecast(productId)));
    }

    /**
     * 상품의 최근 가격 추이(시세 분석 스냅샷의 일별 평균·최저·최고가)를 조회한다.
     *
     * @param productId 조회할 상품 ID
     * @param days 조회 기간(일, 오늘 포함, 1~180, 기본 30)
     * @return 200 OK + 가격 추이(분석 이력이 없으면 {@code points}가 빈 배열)
     */
    @Operation(summary = "상품 가격 추이 조회")
    @GetMapping("/trend")
    public ResponseEntity<ApiResponse<PriceTrendResponse>> getPriceTrend(
            @PathVariable Long productId, @RequestParam(defaultValue = "30") @Min(1) @Max(180) int days) {
        return ResponseEntity.ok(ApiResponse.success(productAnalysisService.getPriceTrend(productId, days)));
    }
}
