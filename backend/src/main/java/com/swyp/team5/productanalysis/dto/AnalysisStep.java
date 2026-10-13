package com.swyp.team5.productanalysis.dto;

/**
 * 시세 분석 1건의 처리 단계(이 순서대로 진행한다). 분석 결과 구독 스트림({@code GET /products/{id}/analysis/stream})이 단계마다
 * {@link AnalysisStepEvent}를 보낸다. 비교 매물이 부족하면 중간 단계에서 끝나고 완료 이벤트의 {@code analysisStatus}가
 * SKIPPED다.
 */
public enum AnalysisStep {
    CANDIDATE_SEARCH("비교할 매물을 찾고 있어요.", "비교할 매물 후보를 찾았어요."), // 키워드 후보 선정(부족하면 상품명 검색)
    AI_ANALYSIS("AI가 같은 물건을 고르고 시세를 판단하고 있어요.", "AI 판단 완료"), // AI 같은 물건 선별 + 추천 근거(최대 2회)
    PRICE_CALCULATION("시세와 추천을 계산하고 있어요.", "시세 계산 완료"), // 최저·평균·최고가, 규칙 추천, 신뢰도
    FORECAST("감가와 가격 전망을 계산하고 있어요.", "감가 예측 완료"), // 감가 예측(1M/3M/6M), 1개월 가격 전망
    SAVE("분석 결과를 저장하고 있어요.", "분석 결과 저장 완료"); // 스냅샷·예측 저장, 추천·시세 변동·목표가 알림

    private final String startMessage;
    private final String doneMessage;

    AnalysisStep(String startMessage, String doneMessage) {
        this.startMessage = startMessage;
        this.doneMessage = doneMessage;
    }

    public String startMessage() {
        return startMessage;
    }

    public String doneMessage() {
        return doneMessage;
    }
}
