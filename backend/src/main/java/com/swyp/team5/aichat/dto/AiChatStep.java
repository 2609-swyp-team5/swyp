package com.swyp.team5.aichat.dto;

/** AI 대화 답변 스트림(SSE)의 처리 단계(이 순서대로 진행한다). 이벤트의 index/total도 이 순서 기준이다. */
public enum AiChatStep {
    INTERPRET("질문을 이해하고 있어요.", "질문 이해 완료"), // 의도·검색 조건 해석(AI 1회)
    SEARCH("매물과 시세를 찾고 있어요.", "매물과 시세를 찾았어요."), // 매물 검색·분석 카드·추천 상품(필요하면 시세 분석 요청)
    WRITE("답변을 작성하고 있어요.", "답변 작성 완료"); // 설명 문장 작성(AI 1회, 문장 조각은 delta 이벤트)

    private final String startMessage;
    private final String doneMessage;

    AiChatStep(String startMessage, String doneMessage) {
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
