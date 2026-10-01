package com.swyp.team5.item.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorColumn;
import jakarta.persistence.DiscriminatorType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import com.swyp.team5.category.entity.Category;
import org.hibernate.annotations.CreationTimestamp;

/**
 * 우리 회원 상품({@code Product})과 외부 플랫폼 수집 매물({@code PlatformListing})의 공통 부모. 출처와 무관하게 쓰는 값(카테고리·
 * 제목·가격·등록일시)만 두고, 출처별 고유 정보는 하위 테이블({@code products}/{@code platform_listings})에 1:1로 둔다(JOINED
 * 상속, 하위 테이블 PK = {@code item_id}). 관심상품·시세 분석·알림은 출처와 상관없이 이 ID 하나로 대상을 가리킨다.
 *
 * <p>다른 엔티티가 지연 로딩으로 참조하면 프록시라 {@code instanceof}로 하위 타입을 판별할 수 없다 — {@link #getSource()}로
 * 판별하고, 하위 타입이 필요하면 {@code Hibernate.unproxy}를 쓴다.
 */
@Entity
@Table(name = "items")
@Inheritance(strategy = InheritanceType.JOINED)
@DiscriminatorColumn(name = "source", discriminatorType = DiscriminatorType.STRING, length = 20)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public abstract class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false)
    private Long price;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt; // 등록 일시(외부 매물은 최초 수집 일시)

    protected Item(Category category, String title, Long price) {
        this.category = category;
        this.title = title;
        this.price = price;
    }

    /** 출처와 무관한 공통 정보를 갱신한다(우리 상품 수정, 외부 매물 재수집). */
    protected void changeItemInfo(Category category, String title, Long price) {
        this.category = category;
        this.title = title;
        this.price = price;
    }

    /**
     * 출처. 판별 컬럼({@code items.source})과 같은 값을 하위 타입이 돌려준다(저장 전 엔티티·지연 로딩 프록시에서도 맞는 값).
     */
    public abstract ListingSource getSource();

    public boolean isExternal() {
        return getSource() == ListingSource.EXTERNAL;
    }
}
