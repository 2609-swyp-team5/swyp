package com.swyp.team5.product.entity;

import java.util.Locale;

import com.fasterxml.jackson.annotation.JsonCreator;

/** 상품 결함(하자) 상태 */
public enum DefectStatus {
    /** 정상(하자 없음) */
    NORMAL,
    /** 하자 있음 */
    ISSUES,
    /** 하자 여부를 확인하지 못함(모름) */
    UNKNOWN;

    /**
     * 대소문자를 구분하지 않고 문자열을 {@link DefectStatus}로 변환한다(프론트가 소문자로 보내도
     * 그대로 처리하기 위함). JSON 역직렬화에는 이 메서드가 {@code @JsonCreator}로 자동 사용되고,
     * 폼/쿼리 파라미터 바인딩에는 {@code common/config}에 등록된 컨버터가 이 메서드를 재사용한다.
     *
     * @param value 원본 문자열(대소문자 무관)
     * @return 변환된 {@link DefectStatus}
     */
    @JsonCreator
    public static DefectStatus from(String value) {
        return DefectStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
    }
}
