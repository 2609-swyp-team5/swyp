package com.swyp.team5.productanalysis.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swyp.team5.productanalysis.entity.PriceForecast;

public interface PriceForecastRepository extends JpaRepository<PriceForecast, Long> {

    List<PriceForecast> findByAnalysisId(Long analysisId);

    /** 상품 삭제 전 정리용 — 해당 상품(아이템)의 시세 분석에 딸린 감가 예측을 모두 지운다. */
    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM PriceForecast f WHERE f.analysis.id IN "
            + "(SELECT a.id FROM ProductAnalysis a WHERE a.item.id = :itemId)")
    int deleteAllByItemId(@Param("itemId") Long itemId);
}
