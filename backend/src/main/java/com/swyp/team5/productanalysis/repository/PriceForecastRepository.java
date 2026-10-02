package com.swyp.team5.productanalysis.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swyp.team5.productanalysis.entity.PriceForecast;

public interface PriceForecastRepository extends JpaRepository<PriceForecast, Long> {

    List<PriceForecast> findByAnalysisId(Long analysisId);
}
