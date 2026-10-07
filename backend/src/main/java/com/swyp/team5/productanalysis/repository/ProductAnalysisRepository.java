package com.swyp.team5.productanalysis.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swyp.team5.product.entity.ProductStatus;
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

    /**
     * {@code since} 이후 등록된 상품 중 분석 결과도, 분석을 건너뛴 기록도 없는 상품 ID(등록 직후 분석이 재시작 등으로 사라진
     * 상품을 다시 분석하기 위함).
     */
    @Query(
            """
            SELECT p.id FROM Product p
            WHERE p.status IN :statuses
              AND p.createdAt >= :since
              AND p.analysisSkippedAt IS NULL
              AND NOT EXISTS (SELECT pa.id FROM ProductAnalysis pa WHERE pa.item.id = p.id)
            ORDER BY p.id
            """)
    List<Long> findUnanalyzedProductIds(
            @Param("statuses") Collection<ProductStatus> statuses, @Param("since") LocalDateTime since);

    /**
     * {@code since} 이후 관심 등록된 대상 중 분석 결과도, 분석을 건너뛴 기록도 없는 대상 ID(관심 등록 직후 분석이 재시작 등으로
     * 사라진 대상을 다시 분석하기 위함). 분석 대상 상태인지는 분석할 때 확인한다.
     */
    @Query(
            """
            SELECT DISTINCT it.id FROM Interest i JOIN i.item it
            WHERE i.createdAt >= :since
              AND it.analysisSkippedAt IS NULL
              AND NOT EXISTS (SELECT pa.id FROM ProductAnalysis pa WHERE pa.item.id = it.id)
            ORDER BY it.id
            """)
    List<Long> findUnanalyzedInterestedItemIds(@Param("since") LocalDateTime since);
}
