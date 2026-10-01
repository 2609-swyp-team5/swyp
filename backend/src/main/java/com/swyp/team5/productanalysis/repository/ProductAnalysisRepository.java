package com.swyp.team5.productanalysis.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swyp.team5.productanalysis.entity.ProductAnalysis;

public interface ProductAnalysisRepository extends JpaRepository<ProductAnalysis, Long> {

    Optional<ProductAnalysis> findFirstByItemIdOrderByAnalyzedAtDesc(Long itemId);

    /** 상품의 {@code after} 이후 스냅샷(분석 시각 오름차순) — 시세 추이 계산용. */
    List<ProductAnalysis> findByItemIdAndAnalyzedAtAfterOrderByAnalyzedAtAsc(Long itemId, LocalDateTime after);

    /** 상품의 {@code from} 이후(포함) 스냅샷(분석 시각 오름차순) — 가격 추이 조회용. */
    List<ProductAnalysis> findByItemIdAndAnalyzedAtGreaterThanEqualOrderByAnalyzedAtAsc(
            Long itemId, LocalDateTime from);

    /** 상품별 가장 최근 스냅샷만 골라 반환한다(상품 목록 조회에서 N+1 없이 한 번에 조회하기 위함). */
    @Query(
            """
            SELECT pa FROM ProductAnalysis pa
            WHERE pa.item.id IN :itemIds
              AND pa.analyzedAt = (
                  SELECT MAX(pa2.analyzedAt) FROM ProductAnalysis pa2 WHERE pa2.item.id = pa.item.id
              )
            """)
    List<ProductAnalysis> findLatestByItemIdIn(@Param("itemIds") List<Long> itemIds);
}
