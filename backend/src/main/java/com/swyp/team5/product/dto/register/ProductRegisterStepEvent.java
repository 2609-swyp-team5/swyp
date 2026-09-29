package com.swyp.team5.product.dto.register;

import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.entity.ProductCondition;

/**
 * 단계별 스트리밍 등록·수정(SSE)의 진행 단계 이벤트 {@code data}. 이벤트는 기존 API 응답과 같은 {@code ApiResponse} 형태로
 * 보내며, 진행 문구는 {@code ApiResponse.message}에 담는다.
 *
 * @param event 이벤트 종류(항상 {@code step})
 * @param step 처리 단계
 * @param status {@code START}(시작) / {@code DONE}(완료) / {@code SKIP}(건너뜀 — 수정만: 새 이미지 없음, 이미지 변경 없음, AI 재분석 실패)
 * @param index 이 방식(직접 등록/AI 등록/수정)의 단계 목록 안에서의 순서(1부터)
 * @param total 이 방식의 전체 단계 수(단계가 추가되면 늘어나므로 클라이언트는 고정값을 쓰지 말 것)
 * @param result 단계 결과(완료 이벤트만 — 업로드 {@link ImageUploadResult}, 분석 {@link ImageAnalysisResult}, 그 외 null)
 */
public record ProductRegisterStepEvent(
        String event, ProductRegisterStep step, String status, int index, int total, Object result) {

    public static final String EVENT = "step";

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
}
