package com.swyp.team5.productanalysis.dto;

import com.swyp.team5.item.entity.AnalysisSkipReason;
import com.swyp.team5.item.entity.Item;

/**
 * 시세 분석 요청 결과.
 *
 * @param analysisStatus 요청 후 상태 — ANALYZING이면 결과가 나올 때까지 {@code GET /products/{id}/analysis}를 다시 조회한다
 */
public record AnalysisRequestResponse(
        Long productId,
        AnalysisStatus analysisStatus,
        AnalysisSkipReason analysisSkipReason, // SKIPPED일 때 건너뛴 사유, 그 밖에는 null
        String analysisSkipMessage) { // analysisSkipReason의 화면 표시 문구, 없으면 null

    public static AnalysisRequestResponse of(Item item, AnalysisStatus status) {
        AnalysisSkipReason reason = status == AnalysisStatus.SKIPPED ? item.getAnalysisSkipReason() : null;
        return new AnalysisRequestResponse(item.getId(), status, reason, reason == null ? null : reason.getMessage());
    }
}
