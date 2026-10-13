package com.swyp.team5.productanalysis.dto;

/**
 * 분석 결과 구독 스트림(SSE)의 진행 단계 이벤트 {@code data}. 상품 등록 스트림과 같이 기존 API 응답과 같은
 * {@code ApiResponse} 형태로 보내며, 진행 문구는 {@code ApiResponse.message}에 담는다.
 *
 * @param event 이벤트 종류(항상 {@code step})
 * @param step 처리 단계
 * @param status {@code WAITING}(분석 대기열에서 차례를 기다림 — 첫 단계로 보냄) / {@code START}(시작) / {@code DONE}(완료)
 * @param index 단계 순서(1부터)
 * @param total 전체 단계 수(단계가 추가되면 늘어나므로 클라이언트는 고정값을 쓰지 말 것)
 */
public record AnalysisStepEvent(String event, AnalysisStep step, String status, int index, int total) {

    public static final String EVENT = "step";
    public static final String WAITING = "WAITING";
    public static final String START = "START";
    public static final String DONE = "DONE";

    public static AnalysisStepEvent of(AnalysisStep step, String status) {
        return new AnalysisStepEvent(EVENT, step, status, step.ordinal() + 1, AnalysisStep.values().length);
    }

    /** 분석 대기열에서 차례를 기다리는 중(첫 단계 시작 전). */
    public static AnalysisStepEvent waiting() {
        return of(AnalysisStep.values()[0], WAITING);
    }

    /** 진행 문구(대기·시작·완료별). */
    public String message() {
        return switch (status) {
            case WAITING -> "분석 순서를 기다리고 있어요.";
            case DONE -> step.doneMessage();
            default -> step.startMessage();
        };
    }

    /** 같은 분석 안에서의 진행 순서(늦게 도착한 이전 단계 이벤트를 거르는 데 쓴다). */
    public int progressRank() {
        int statusRank = WAITING.equals(status) ? 0 : START.equals(status) ? 1 : 2;
        return step.ordinal() * 3 + statusRank;
    }
}
