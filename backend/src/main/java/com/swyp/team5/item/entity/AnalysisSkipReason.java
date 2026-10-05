package com.swyp.team5.item.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** 시세 분석을 건너뛴 사유. 화면에 그대로 보여 줄 문구를 함께 둔다. */
@Getter
@RequiredArgsConstructor
public enum AnalysisSkipReason {
    NOT_ENOUGH_CANDIDATES("비교할 판매 글이 부족해 아직 분석하지 못했어요."), // 상품명 검색까지 해도 키워드가 겹치는 후보가 최소 수보다 적음
    NOT_ENOUGH_SIMILAR("같은 물건 판매 글이 부족해 아직 분석하지 못했어요."); // AI가 같은 물건으로 확인한 매물이 최소 수보다 적음

    private final String message;
}
