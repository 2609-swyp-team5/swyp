package com.swyp.team5.product.dto.register;

import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.productanalysis.dto.AnalysisStatus;
import com.swyp.team5.productanalysis.dto.AnalysisStep;
import com.swyp.team5.productanalysis.dto.AnalysisStepEvent;
import com.swyp.team5.productanalysis.dto.ProductAnalysisResponse;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;

/**
 * 단계별 스트리밍 등록·수정(SSE)의 진행 단계 이벤트 {@code data}. 이벤트는 기존 API 응답과 같은 {@code ApiResponse} 형태로
 * 보내며, 진행 문구는 {@code ApiResponse.message}에 담는다.
 *
 * @param event 이벤트 종류(항상 {@code step})
 * @param step 처리 단계
 * @param status {@code START}(시작) / {@code PROGRESS}(진행 — 시세 분석 단계만: 분석 안의 세부 단계가 바뀜) / {@code DONE}(완료) /
 *     {@code SKIP}(건너뜀 — 수정: 새 이미지 없음, 이미지 변경 없음, AI 재분석 실패 / 시세 분석: 비교 매물 부족·분석 대상 아님·대기 시간 초과·오류)
 * @param index 이 방식(직접 등록/AI 등록/수정)의 단계 목록 안에서의 순서(1부터)
 * @param total 이 방식의 전체 단계 수(단계가 추가되면 늘어나므로 클라이언트는 고정값을 쓰지 말 것)
 * @param result 단계 결과 — 업로드 완료 {@link ImageUploadResult}, 사진 분석 완료 {@link ImageAnalysisResult}, 시세 분석 진행
 *     {@link MarketAnalysisProgress}·완료/건너뜀 {@link MarketAnalysisResult}, 그 외 null
 */
public record ProductRegisterStepEvent(
        String event, ProductRegisterStep step, String status, int index, int total, Object result) {

    public static final String EVENT = "step";
    public static final String PROGRESS = "PROGRESS";

    public static ProductRegisterStepEvent of(
            ProductRegisterStep step, String status, int index, int total, Object result) {
        return new ProductRegisterStepEvent(EVENT, step, status, index, total, result);
    }

    /** 이미지 업로드 단계 결과(저장 전이라 URL은 보내지 않음). */
    public record ImageUploadResult(int imageCount) {}

    /** AI 사진 분석 단계 결과(상품 저장 전 미리보기용). */
    public record ImageAnalysisResult(
            Long categoryId,
            String title,
            String brand,
            ProductCondition condition,
            Long suggestedPrice,
            String analysisDescription) {

        public static ImageAnalysisResult from(ProductAiAnalysisResult analysis) {
            return new ImageAnalysisResult(
                    analysis.categoryId(),
                    analysis.title(),
                    analysis.brand(),
                    analysis.condition(),
                    analysis.suggestedPrice(),
                    analysis.analysisDescription());
        }
    }

    /**
     * 시세 분석 단계 안의 세부 진행({@code GET /products/{id}/analysis/stream}의 {@code step} 이벤트와 같은 값).
     *
     * @param step 분석 세부 단계
     * @param status {@code WAITING}(분석 순서 대기) / {@code START} / {@code DONE}
     * @param index 세부 단계 순서(1부터)
     * @param total 세부 단계 수
     */
    public record MarketAnalysisProgress(AnalysisStep step, String status, int index, int total) {

        public static MarketAnalysisProgress from(AnalysisStepEvent event) {
            return new MarketAnalysisProgress(event.step(), event.status(), event.index(), event.total());
        }
    }

    /**
     * 시세 분석 단계 결과(전체 결과는 {@code complete} 이벤트의 {@code marketAnalysis}).
     *
     * @param analysisStatus 분석 상태(ANALYZED 완료 / SKIPPED 비교 매물 부족 / ANALYZING 대기 시간 안에 끝나지 않음 / 그 밖)
     * @param recommendation 판매 추천(SELL/HOLD), 분석 결과가 없으면 null
     */
    public record MarketAnalysisResult(AnalysisStatus analysisStatus, AnalysisRecommendation recommendation) {

        public static MarketAnalysisResult from(ProductAnalysisResponse analysis) {
            return new MarketAnalysisResult(analysis.analysisStatus(), analysis.recommendation());
        }
    }
}
