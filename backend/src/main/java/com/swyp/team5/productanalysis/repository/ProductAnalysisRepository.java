package com.swyp.team5.productanalysis.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swyp.team5.productanalysis.entity.ProductAnalysis;

public interface ProductAnalysisRepository extends JpaRepository<ProductAnalysis, Long> {

    Optional<ProductAnalysis> findFirstByProductIdOrderByAnalyzedAtDesc(Long productId);

    /** 상품별 가장 최근 스냅샷만 골라 반환한다(상품 목록 조회에서 N+1 없이 한 번에 조회하기 위함). */
    @Query(
            """
            SELECT pa FROM ProductAnalysis pa
            WHERE pa.product.id IN :productIds
              AND pa.analyzedAt = (
                  SELECT MAX(pa2.analyzedAt) FROM ProductAnalysis pa2 WHERE pa2.product.id = pa.product.id
              )
            """)
    List<ProductAnalysis> findLatestByProductIdIn(@Param("productIds") List<Long> productIds);
}
