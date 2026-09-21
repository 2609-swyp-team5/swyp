package com.swyp.team5.interest.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
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

import com.swyp.team5.member.entity.Member;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.product.entity.Product;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * 관심 상품(찜) 엔티티. 회원이 특정 상품 또는 외부 플랫폼 수집 매물에 관심을 등록하면 생성되며, 목표가/
 * 알림 발송 이력을 함께 관리한다. {@code product}/{@code listing}은 배타적(정확히 하나만 채워짐).
 */
@Entity
@Table(name = "interests")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Interest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "interest_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product; // 우리 회원 상품(listing과 배타적)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listing_id")
    private PlatformListing listing; // 외부 플랫폼 수집 매물(product와 배타적)

    @Column(name = "target_price")
    private Long targetPrice; // 목표 가격(선택, 도달 시 알림 트리거)

    @Column(name = "notified_at")
    private LocalDateTime notifiedAt; // 알림 발송 이력 추적용(목표가 재설정 시 초기화)

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private Interest(Member member, Product product, PlatformListing listing) {
        this.member = member;
        this.product = product;
        this.listing = listing;
    }

    public static Interest ofProduct(Member member, Product product) {
        return new Interest(member, product, null);
    }

    public static Interest ofListing(Member member, PlatformListing listing) {
        return new Interest(member, null, listing);
    }

    /** 목표가를 재설정한다. 명세상 재설정 시 알림 발송 이력이 초기화되어 다시 알림 대상이 될 수 있다. */
    public void changeTargetPrice(Long targetPrice) {
        this.targetPrice = targetPrice;
        this.notifiedAt = null;
    }
}
