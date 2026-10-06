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

import com.swyp.team5.item.entity.Item;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.product.entity.Product;
import org.hibernate.Hibernate;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * 관심 상품(찜) 엔티티. 회원이 특정 상품 또는 외부 플랫폼 수집 매물에 관심을 등록하면 생성되며, 목표가/
 * 알림 발송 이력을 함께 관리한다. 대상은 {@code item} 하나(우리 상품·외부 매물 공통 부모)로 가리킨다.
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
    @JoinColumn(name = "item_id", nullable = false)
    private Item item; // 관심 대상(우리 상품 또는 외부 매물 — item.getSource()로 구분)

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

    private Interest(Member member, Item item) {
        this.member = member;
        this.item = item;
    }

    public static Interest ofProduct(Member member, Product product) {
        return new Interest(member, product);
    }

    public static Interest ofListing(Member member, PlatformListing listing) {
        return new Interest(member, listing);
    }

    /** 대상이 우리 상품이면 그 상품, 외부 매물이면 {@code null}. */
    public Product getProduct() {
        return Hibernate.unproxy(item) instanceof Product product ? product : null;
    }

    /** 대상이 외부 매물이면 그 매물, 우리 상품이면 {@code null}. */
    public PlatformListing getListing() {
        return Hibernate.unproxy(item) instanceof PlatformListing listing ? listing : null;
    }

    /** 목표가 알림 대상의 현재 가격(우리 상품은 등록가, 외부 매물은 수집가). */
    public Long currentPrice() {
        return item.getPrice();
    }

    /** 목표가 도달 알림을 보냈다고 기록한다(같은 도달로 다시 보내지 않음). */
    public void markTargetPriceNotified(LocalDateTime notifiedAt) {
        this.notifiedAt = notifiedAt;
    }

    /** 가격이 목표가보다 다시 올라 알림 기록을 지운다(다음에 목표가 이하로 내려오면 다시 알림). */
    public void resetTargetPriceNotified() {
        this.notifiedAt = null;
    }

    /**
     * 목표가를 재설정한다({@code null}이면 해제). 이미 도달 알림을 보냈고 새 목표가로도 현재 가격이 여전히 목표가 이하면 기록을
     * 유지해 같은 도달로 다시 알리지 않는다. 해제하거나 아직 도달하지 않은 목표가로 바꾸면 기록을 지워 도달할 때 다시 알린다.
     */
    public void changeTargetPrice(Long targetPrice) {
        this.targetPrice = targetPrice;
        Long currentPrice = currentPrice();
        boolean stillReached = targetPrice != null && currentPrice != null && currentPrice <= targetPrice;
        if (!stillReached) {
            this.notifiedAt = null;
        }
    }
}
