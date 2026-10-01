package com.swyp.team5.productanalysis.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swyp.team5.productanalysis.entity.ProductAnalysis;

public interface ProductAnalysisRepository extends JpaRepository<ProductAnalysis, Long> {

    Optional<ProductAnalysis> findFirstByProductIdOrderByAnalyzedAtDesc(Long productId);

    Optional<ProductAnalysis> findFirstByListingIdOrderByAnalyzedAtDesc(Long listingId);

    /** 상품의 {@code after} 이후 스냅샷(분석 시각 오름차순) — 시세 추이 계산용. */
    List<ProductAnalysis> findByProductIdAndAnalyzedAtAfterOrderByAnalyzedAtAsc(Long productId, LocalDateTime after);

    /** 외부 매물의 {@code after} 이후 스냅샷(분석 시각 오름차순) — 시세 추이 계산용. */
    List<ProductAnalysis> findByListingIdAndAnalyzedAtAfterOrderByAnalyzedAtAsc(Long listingId, LocalDateTime after);

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

    /** 외부 매물별 가장 최근 스냅샷만 골라 반환한다(관심상품 목록 조회에서 N+1 없이 한 번에 조회하기 위함). */
    @Query(
            """
            SELECT pa FROM ProductAnalysis pa
            WHERE pa.listing.id IN :listingIds
              AND pa.analyzedAt = (
                  SELECT MAX(pa2.analyzedAt) FROM ProductAnalysis pa2 WHERE pa2.listing.id = pa.listing.id
              )
            """)
    List<ProductAnalysis> findLatestByListingIdIn(@Param("listingIds") List<Long> listingIds);
}
