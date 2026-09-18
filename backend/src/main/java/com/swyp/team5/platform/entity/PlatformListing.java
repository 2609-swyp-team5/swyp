package com.swyp.team5.platform.entity;

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

import com.swyp.team5.category.entity.Category;
import org.hibernate.annotations.CreationTimestamp;

/**
 * 외부 플랫폼({@link Platform})에서 수집한 개별 매물 스냅샷. {@code (platform, externalItemId)} 기준으로
 * 크롤링 때마다 upsert되며, {@link #lastSeenAt}은 관측될 때마다 갱신되어 판매완료/삭제 추정에 쓰인다.
 */
@Entity
@Table(name = "platform_listings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlatformListing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "listing_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "platform_id", nullable = false)
    private Platform platform;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(name = "external_item_id", nullable = false)
    private String externalItemId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false)
    private Long price;

    @Column(nullable = false, length = 50)
    private String status;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "listing_url", columnDefinition = "TEXT")
    private String listingUrl;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_seen_at", nullable = false)
    private LocalDateTime lastSeenAt;

    private PlatformListing(
            Platform platform,
            Category category,
            String externalItemId,
            String title,
            Long price,
            String status,
            String imageUrl,
            String listingUrl) {
        this.platform = platform;
        this.category = category;
        this.externalItemId = externalItemId;
        this.title = title;
        this.price = price;
        this.status = status;
        this.imageUrl = imageUrl;
        this.listingUrl = listingUrl;
        this.lastSeenAt = LocalDateTime.now();
    }

    /** 처음 관측된 매물을 신규 생성한다. */
    public static PlatformListing create(
            Platform platform,
            Category category,
            String externalItemId,
            String title,
            Long price,
            String status,
            String imageUrl,
            String listingUrl) {
        return new PlatformListing(platform, category, externalItemId, title, price, status, imageUrl, listingUrl);
    }

    /** 이미 저장된 매물이 다시 관측됐을 때 최신 값으로 갱신한다. */
    public void observe(
            Category category, String title, Long price, String status, String imageUrl, String listingUrl) {
        this.category = category;
        this.title = title;
        this.price = price;
        this.status = status;
        this.imageUrl = imageUrl;
        this.listingUrl = listingUrl;
        this.lastSeenAt = LocalDateTime.now();
    }
}
