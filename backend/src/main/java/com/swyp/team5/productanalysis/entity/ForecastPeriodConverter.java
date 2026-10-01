package com.swyp.team5.productanalysis.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** {@link ForecastPeriod} ↔ DB 값({@code 1M/3M/6M}). 상수 이름이 숫자로 시작할 수 없어 {@code @Enumerated} 대신 쓴다. */
@Converter
public class ForecastPeriodConverter implements AttributeConverter<ForecastPeriod, String> {

    @Override
    public String convertToDatabaseColumn(ForecastPeriod period) {
        return period == null ? null : period.getCode();
    }

    @Override
    public ForecastPeriod convertToEntityAttribute(String code) {
        return code == null ? null : ForecastPeriod.fromCode(code);
    }
}
