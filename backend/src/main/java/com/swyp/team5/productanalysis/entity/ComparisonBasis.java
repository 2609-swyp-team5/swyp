package com.swyp.team5.productanalysis.entity;

/** 시세 분석에 쓴 비교 매물의 기준. */
public enum ComparisonBasis {
    SAME, // AI가 같은 물건(같은 종류·모델)으로 확인한 매물
    RELATED // 같은 물건이 부족해 쓴 같은 종류·시리즈의 비슷한 매물(세대·용량 등 일부 사양이 다르거나 확인 안 됨) — 신뢰도는 LOW
}
