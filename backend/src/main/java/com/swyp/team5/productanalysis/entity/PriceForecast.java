package com.swyp.team5.productanalysis.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/** 시세 분석 스냅샷 1건에 딸린 기간별(1M/3M/6M) 감가 예측가. */
@Entity
@Table(name = "price_forecasts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PriceForecast {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "forecast_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_id", nullable = false)
    private ProductAnalysis analysis;

    @Column(name = "expected_price", nullable = false)
    private Long expectedPrice;

    @Convert(converter = ForecastPeriodConverter.class)
    @ColumnTransformer(write = "CAST(? AS forecast_period)")
    @Column(nullable = false, columnDefinition = "forecast_period")
    private ForecastPeriod period;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private PriceForecast(ProductAnalysis analysis, ForecastPeriod period, long expectedPrice) {
        this.analysis = analysis;
        this.period = period;
        this.expectedPrice = expectedPrice;
    }

    public static PriceForecast of(ProductAnalysis analysis, ForecastPeriod period, long expectedPrice) {
        return new PriceForecast(analysis, period, expectedPrice);
    }
}
