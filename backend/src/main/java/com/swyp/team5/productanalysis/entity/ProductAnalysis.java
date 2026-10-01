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

import com.swyp.team5.item.entity.Item;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.product.entity.Product;
import org.hibernate.Hibernate;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

/**
 * 시세 분석 스냅샷. 같은 카테고리 비교 매물({@code platform_listings}) 통계와 AI 판단 결과를
 * 함께 기록한다. 분석 대상은 우리 상품({@code product}) 또는 관심 등록된 외부 매물({@code listing}) 중
 * 정확히 하나다.
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
    @JoinColumn(name = "item_id", nullable = false)
    private Item item; // 분석 대상(우리 상품 또는 관심 등록된 외부 매물)

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
            Product product,
            PlatformListing listing,
            Long minPrice,
            Long averagePrice,
            Long maxPrice,
            BigDecimal changeRate,
            AnalysisRecommendation recommendation,
            Long suggestedPrice,
            String description,
            LocalDateTime analyzedAt) {
        this.item = product != null ? product : listing;
        this.minPrice = minPrice;
        this.averagePrice = averagePrice;
        this.maxPrice = maxPrice;
        this.changeRate = changeRate;
        this.recommendation = recommendation;
        this.suggestedPrice = suggestedPrice;
        this.description = description;
        this.analyzedAt = analyzedAt;
    }

    /** 대상이 우리 상품이면 그 상품, 외부 매물이면 {@code null}. */
    public Product getProduct() {
        return Hibernate.unproxy(item) instanceof Product product ? product : null;
    }

    /** 대상이 외부 매물이면 그 매물, 우리 상품이면 {@code null}. */
    public PlatformListing getListing() {
        return Hibernate.unproxy(item) instanceof PlatformListing listing ? listing : null;
    }

    /**
     * 비교 매물({@code platform_listings}) 통계 + AI 판단 결과로 우리 상품의 분석 스냅샷을 생성한다.
     *
     * @param changeRate 직전 스냅샷 대비 평균가 변동률(직전 스냅샷이 없으면 null)
     */
    public static ProductAnalysis create(
            Product product,
            long minPrice,
            long averagePrice,
            long maxPrice,
            BigDecimal changeRate,
            AnalysisRecommendation recommendation,
            Long suggestedPrice,
            String description,
            LocalDateTime analyzedAt) {
        return ProductAnalysis.builder()
                .product(product)
                .minPrice(minPrice)
                .averagePrice(averagePrice)
                .maxPrice(maxPrice)
                .changeRate(changeRate)
                .recommendation(recommendation)
                .suggestedPrice(suggestedPrice)
                .description(description)
                .analyzedAt(analyzedAt)
                .build();
    }

    /** 관심 등록된 외부 매물의 분석 스냅샷을 생성한다(구매자 관점 추천 BUY/WAIT). */
    public static ProductAnalysis createForListing(
            PlatformListing listing,
            long minPrice,
            long averagePrice,
            long maxPrice,
            BigDecimal changeRate,
            AnalysisRecommendation recommendation,
            Long suggestedPrice,
            String description,
            LocalDateTime analyzedAt) {
        return ProductAnalysis.builder()
                .listing(listing)
                .minPrice(minPrice)
                .averagePrice(averagePrice)
                .maxPrice(maxPrice)
                .changeRate(changeRate)
                .recommendation(recommendation)
                .suggestedPrice(suggestedPrice)
                .description(description)
                .analyzedAt(analyzedAt)
                .build();
    }
}
