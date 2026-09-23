package com.swyp.team5.platform.entity;

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
import lombok.Getter;
import lombok.NoArgsConstructor;

import com.swyp.team5.product.entity.Product;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

/**
 * 상품의 외부 플랫폼(번개장터 등) 게시 연동 정보. 사용자가 직접 등록한 매물 주소를 연동하면
 * ({@link #link}) 곧바로 게시된 상태({@link ProductPlatformStatus#POSTED})로, 우리 서버가 대신 등록하면
 * ({@link #startPosting}) 등록 진행 중({@link ProductPlatformStatus#POSTING}) 상태로 생성된 뒤 결과에 따라
 * 게시됨/실패로 전환된다.
 */
@Entity
@Table(name = "product_platforms")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProductPlatform {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_platform_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_platform_id", nullable = false)
    private MemberPlatform memberPlatform;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "external_product_id")
    private String externalProductId; // 번개장터 상품 ID(pid)

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "product_platform_status")
    private ProductPlatformStatus status;

    @Column(name = "product_url", columnDefinition = "TEXT")
    private String productUrl;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private ProductPlatform(
            MemberPlatform memberPlatform,
            Product product,
            String externalProductId,
            String productUrl,
            ProductPlatformStatus status) {
        this.memberPlatform = memberPlatform;
        this.product = product;
        this.externalProductId = externalProductId;
        this.productUrl = productUrl;
        this.status = status;
    }

    /** 사용자가 이미 번개장터에 등록한 매물의 주소를 우리 쪽에 연동(추적 시작)할 때 사용한다. */
    public static ProductPlatform link(
            MemberPlatform memberPlatform, Product product, String externalProductId, String productUrl) {
        return new ProductPlatform(
                memberPlatform, product, externalProductId, productUrl, ProductPlatformStatus.POSTED);
    }

    /** 우리 서버가 외부 플랫폼에 매물 등록을 시작할 때 사용한다(매물 ID/주소는 등록 완료 후 채워진다). */
    public static ProductPlatform startPosting(MemberPlatform memberPlatform, Product product) {
        return new ProductPlatform(memberPlatform, product, null, null, ProductPlatformStatus.POSTING);
    }

    /** 이전에 실패했거나 내려간 매물을 다시 등록할 때 사용한다. */
    public void restartPosting() {
        this.externalProductId = null;
        this.productUrl = null;
        this.status = ProductPlatformStatus.POSTING;
    }

    /** 등록 진행 중 상태가 기준 시각 이후에도 유지되고 있는지(= 아직 다른 요청이 등록 중인지) 확인한다. */
    public boolean isPostingSince(LocalDateTime threshold) {
        return status == ProductPlatformStatus.POSTING && updatedAt != null && updatedAt.isAfter(threshold);
    }

    public void markPosted() {
        this.status = ProductPlatformStatus.POSTED;
    }

    public void markPosted(String externalProductId, String productUrl) {
        this.externalProductId = externalProductId;
        this.productUrl = productUrl;
        this.status = ProductPlatformStatus.POSTED;
    }

    public void markFailed() {
        this.status = ProductPlatformStatus.FAILED;
    }

    public void markRemoved() {
        this.status = ProductPlatformStatus.REMOVED;
    }
}
