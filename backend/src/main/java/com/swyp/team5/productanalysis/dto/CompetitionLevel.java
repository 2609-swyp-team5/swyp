package com.swyp.team5.productanalysis.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** 경쟁 정도. 같은 유형 판매 중 매물 수로 정한다({@code analysis.competition.*}, 0건이면 NONE). */
@Getter
@RequiredArgsConstructor
public enum CompetitionLevel {
    NONE("없음"),
    LOW("낮음"),
    MEDIUM("보통"),
    HIGH("높음");

    private final String label;
}
