package com.swyp.team5.productanalysis.dto;

import com.swyp.team5.productanalysis.entity.PriceForecast;

/** @param period 예측 기간({@code 1M}/{@code 3M}/{@code 6M}) */
public record PriceForecastResponse(String period, Long expectedPrice) {

    public static PriceForecastResponse from(PriceForecast forecast) {
        return new PriceForecastResponse(forecast.getPeriod().getCode(), forecast.getExpectedPrice());
    }
}
