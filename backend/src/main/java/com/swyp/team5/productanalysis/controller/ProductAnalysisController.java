package com.swyp.team5.productanalysis.controller;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.productanalysis.dto.ProductAnalysisResponse;
import com.swyp.team5.productanalysis.service.ProductAnalysisService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "ProductAnalysis", description = "상품 시세 분석")
@RestController
@RequestMapping("/products/{productId}/analysis")
@RequiredArgsConstructor
public class ProductAnalysisController {

    private final ProductAnalysisService productAnalysisService;

    /**
     * 상품의 가장 최근 시세 분석 결과를 조회한다.
     *
     * @param productId 조회할 상품 ID
     * @return 200 OK + 시세 분석 결과(분석 이력이 없으면 필드가 전부 null)
     */
    @Operation(summary = "상품 시세 분석 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<ProductAnalysisResponse>> getAnalysis(@PathVariable Long productId) {
        return ResponseEntity.ok(ApiResponse.success(productAnalysisService.getLatestAnalysis(productId)));
    }
}
