package com.swyp.team5.product.dto.register;

import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.entity.ProductCondition;

/**
 * 단계별 스트리밍 등록(v2)의 {@code step} 이벤트 데이터.
 *
 * @param step 처리 단계
 * @param status {@code START}(시작) / {@code DONE}(완료) / {@code SKIP}(건너뜀 — 직접 등록의 AI 분석 실패만)
 * @param index 이 등록 방식의 단계 목록 안에서의 순서(1부터)
 * @param total 이 등록 방식의 전체 단계 수(단계가 추가되면 늘어나므로 클라이언트는 고정값을 쓰지 말 것)
 * @param message 화면에 보여줄 수 있는 진행 문구
 * @param result 단계 결과(완료 이벤트만 — 업로드 {@link ImageUploadResult}, 분석 {@link ImageAnalysisResult}, 그 외 null)
 */
public record ProductRegisterStepEvent(
        ProductRegisterStep step, String status, int index, int total, String message, Object result) {

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
