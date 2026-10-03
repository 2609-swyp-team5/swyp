package com.swyp.team5.productanalysis.dto;

import java.util.Comparator;
import java.util.List;

import com.swyp.team5.productanalysis.entity.PriceForecast;

/** @param period 예측 기간({@code 1M}/{@code 3M}/{@code 6M}) */
public record PriceForecastResponse(String period, Long expectedPrice) {

    public static PriceForecastResponse from(PriceForecast forecast) {
        return new PriceForecastResponse(forecast.getPeriod().getCode(), forecast.getExpectedPrice());
    }

    /** 예측 기간 순(1M/3M/6M)으로 정렬해 변환한다. */
    public static List<PriceForecastResponse> sorted(List<PriceForecast> forecasts) {
        return forecasts.stream()
                .sorted(Comparator.comparing(PriceForecast::getPeriod))
                .map(PriceForecastResponse::from)
                .toList();
    }
}
