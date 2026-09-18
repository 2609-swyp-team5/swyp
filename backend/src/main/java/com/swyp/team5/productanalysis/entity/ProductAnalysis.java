package com.swyp.team5.productanalysis.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import com.swyp.team5.product.entity.Product;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

/**
 * 상품 시세 분석 스냅샷. 시세 데이터 수집 시점의 카테고리 평균/최저/최고가를 기록한다.
 * {@code recommendation}(지금 팔기/기다리기 등 판단)은 별도 분석 로직이 채우므로 수집 단계에서는
 * 비워둔다.
 */
@Entity
@Table(name = "product_analysis")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProductAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "analysis_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(columnDefinition = "analysis_recommendation")
    private AnalysisRecommendation recommendation; // 판단 로직(별도 작업)이 채움, 수집 단계에서는 null

    @Column(name = "suggested_price")
    private Long suggestedPrice;

    @Column(name = "average_price", nullable = false)
    private Long averagePrice;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "max_price", nullable = false)
    private Long maxPrice;

    @Column(name = "change_rate", precision = 7, scale = 4)
    private BigDecimal changeRate;

    @Column(name = "min_price", nullable = false)
    private Long minPrice;

    @Column(name = "analyzed_at", nullable = false)
    private LocalDateTime analyzedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    private ProductAnalysis(
            Product product, Long minPrice, Long averagePrice, Long maxPrice, LocalDateTime analyzedAt) {
        this.product = product;
        this.minPrice = minPrice;
        this.averagePrice = averagePrice;
        this.maxPrice = maxPrice;
        this.analyzedAt = analyzedAt;
    }

    /**
     * 크롤링으로 수집한 카테고리 단위 시세 통계로 스냅샷을 생성한다. {@code recommendation}/
     * {@code suggestedPrice}/{@code description}/{@code changeRate}는 이 단계에서 채우지 않고,
     * 이후 별도 분석 로직이 채운다.
     */
    public static ProductAnalysis fromCategoryPriceStats(
            Product product, long minPrice, long averagePrice, long maxPrice, LocalDateTime analyzedAt) {
        return ProductAnalysis.builder()
                .product(product)
                .minPrice(minPrice)
                .averagePrice(averagePrice)
                .maxPrice(maxPrice)
                .analyzedAt(analyzedAt)
                .build();
    }
}
