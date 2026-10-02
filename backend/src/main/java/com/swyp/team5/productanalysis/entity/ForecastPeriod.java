package com.swyp.team5.productanalysis.entity;

import java.util.Arrays;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** 감가 예측 기간. DB 값({@code forecast_period} 타입)은 {@code 1M/3M/6M}이라 {@link ForecastPeriodConverter}로 변환한다. */
@Getter
@RequiredArgsConstructor
public enum ForecastPeriod {
    ONE_MONTH("1M", 1),
    THREE_MONTHS("3M", 3),
    SIX_MONTHS("6M", 6);

    private final String code;
    private final int months;

    public static ForecastPeriod fromCode(String code) {
        return Arrays.stream(values())
                .filter(period -> period.code.equals(code))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("알 수 없는 예측 기간입니다: " + code));
    }
}
