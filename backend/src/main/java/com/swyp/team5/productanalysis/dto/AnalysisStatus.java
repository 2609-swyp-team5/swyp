package com.swyp.team5.productanalysis.dto;

/** 상품(외부 매물 포함)의 시세 분석 상태. 분석 결과가 없을 때 화면이 이유를 구분해 보여 주기 위함이다. */
public enum AnalysisStatus {
    ANALYZED, // 분석 결과가 있음
    ANALYZING, // 분석 대기열에 있거나 분석 중(서버 메모리 기준 — 재시작하면 사라짐)
    SKIPPED, // 마지막 분석을 비교 매물 부족으로 건너뜀(사유는 analysisSkipReason)
    NOT_ANALYZED, // 아직 분석한 적 없음(분석 요청 가능)
    UNAVAILABLE // 분석 대상 상태가 아님(판매완료·판매중지 등) — 분석 요청해도 실행하지 않음
}
