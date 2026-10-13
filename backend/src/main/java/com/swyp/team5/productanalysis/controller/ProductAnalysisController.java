package com.swyp.team5.productanalysis.controller;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import lombok.RequiredArgsConstructor;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.common.passport.PrincipalMember;
import com.swyp.team5.productanalysis.dto.AnalysisPerspective;
import com.swyp.team5.productanalysis.dto.AnalysisRequestResponse;
import com.swyp.team5.productanalysis.dto.AnalysisStatus;
import com.swyp.team5.productanalysis.dto.PriceDistributionResponse;
import com.swyp.team5.productanalysis.dto.PriceTrendResponse;
import com.swyp.team5.productanalysis.dto.ProductAnalysisResponse;
import com.swyp.team5.productanalysis.dto.ProductForecastResponse;
import com.swyp.team5.productanalysis.service.AnalysisRequestService;
import com.swyp.team5.productanalysis.service.AnalysisStreamService;
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
    private final AnalysisRequestService analysisRequestService;
    private final AnalysisStreamService analysisStreamService;

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
     * 상품(외부 매물 포함)의 시세 분석을 요청한다. 분석은 별도로 돌고 결과는 {@link #getAnalysis}로 확인한다. 이미 분석 중이거나, 최근에
     * 분석했거나 비교 매물 부족으로 건너뛰었거나, 분석 대상 상태가 아니면 분석하지 않고 현재 상태만 돌려준다. {@code force=true}면
     * 판매자 본인 상품만 최근 분석 여부와 관계없이 다시 분석한다("AI 분석 재시도", 최소 간격 {@code analysis.force-retry-minutes}분).
     *
     * @param productId 분석할 상품 ID(외부 매물 ID 포함)
     * @param force 판매자의 강제 재분석 여부(기본 false, 본인 상품이 아니면 403)
     * @return 202 Accepted(분석 대기열에 넣음 — {@code analysisStatus}가 ANALYZING) 또는 200 OK(그 밖의 상태)
     */
    @Operation(summary = "상품 시세 분석 요청")
    @PostMapping
    public ResponseEntity<ApiResponse<AnalysisRequestResponse>> requestAnalysis(
            @AuthenticationPrincipal PrincipalMember currentMember,
            @PathVariable Long productId,
            @RequestParam(defaultValue = "false") boolean force) {
        AnalysisRequestResponse response = analysisRequestService.request(productId, currentMember.memberId(), force);
        HttpStatus status = response.analysisStatus() == AnalysisStatus.ANALYZING ? HttpStatus.ACCEPTED : HttpStatus.OK;
        return ResponseEntity.status(status).body(ApiResponse.success(response));
    }

    /**
     * 시세 분석 진행 단계와 결과를 SSE로 구독한다. 분석 중(대기열 포함)이면 지금 단계와 이후 단계 변화를 {@code step} 이벤트로
     * 보내다가 끝나면 결과({@link #getAnalysis}와 같은 필드)를 {@code complete} 이벤트로 보내고 닫는다. 분석 중이 아니면
     * {@code complete}만 바로 보내고 닫는다. 이벤트 종류는 {@code data.event}로 구분한다(상품 등록 스트림과 같음). 분석 요청
     * ({@link #requestAnalysis})이나 상품 등록 뒤에 결과를 반복 조회하는 대신 쓴다. 스트림 시간({@code analysis.stream.timeout})이
     * 지나면 그때의 결과(아직 분석 중이면 ANALYZING)를 {@code complete}로 보내고 닫는다.
     *
     * @param productId 구독할 상품 ID(외부 매물 ID 포함)
     * @param perspective 결과 관점(SELL 기본 — 판매자 추천, BUY — 구매자 추천)
     * @return 200 OK + SSE 스트림({@code complete} 이벤트 후 종료)
     */
    @Operation(summary = "상품 시세 분석 진행·결과 구독(SSE)")
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> streamAnalysis(
            @PathVariable Long productId, @RequestParam(defaultValue = "SELL") AnalysisPerspective perspective) {
        // 프록시(nginx 등)가 이벤트를 모아 보내지 않도록 버퍼링·캐시를 끈다
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .header("X-Accel-Buffering", "no")
                .body(analysisStreamService.subscribe(productId, perspective));
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
     * 상품의 거래 가격 분포를 판매 중(가장 최근 시세 분석의 비교 매물)과 판매 완료(최근 {@code days}일 안에 판매 완료가 확인된 비슷한
     * 외부 매물의 판매 직전 등록가, 조회 시점 계산) 두 가지로 함께 조회한다. 화면 탭 전환은 이 응답에서 고른다.
     *
     * @param productId 조회할 상품 ID(외부 매물 ID 포함)
     * @param days 판매 완료 조회 기간(일, 오늘 포함, 1~180, 기본 90)
     * @return 200 OK + 판매 중·판매 완료 가격 분포(각각 매물이 없으면 {@code count} 0, {@code buckets} 빈 배열)
     */
    @Operation(summary = "상품 거래 가격 분포 조회(판매 중·판매 완료)")
    @GetMapping("/distribution")
    public ResponseEntity<ApiResponse<PriceDistributionResponse>> getPriceDistribution(
            @PathVariable Long productId, @RequestParam(defaultValue = "90") @Min(1) @Max(180) int days) {
        return ResponseEntity.ok(ApiResponse.success(productAnalysisService.getPriceDistribution(productId, days)));
    }

    /**
     * 상품의 최근 가격 추이(시세 분석 스냅샷의 일별 평균·최저·최고가)를 조회한다. 첫 기록일이 오늘로부터 3개월 이상 지났으면 달별로
     * 묶어 돌려준다(응답 {@code priceTrend.unit} — DAY/MONTH).
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
