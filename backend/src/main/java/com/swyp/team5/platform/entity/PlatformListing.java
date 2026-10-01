package com.swyp.team5.platform.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.item.entity.Item;
import com.swyp.team5.item.entity.ListingSource;

/**
 * 외부 플랫폼({@link Platform})에서 수집한 개별 매물 스냅샷. {@code (platform, externalItemId)} 기준으로
 * 크롤링 때마다 upsert되며, {@link #lastSeenAt}은 관측될 때마다 갱신되어 판매완료/삭제 추정에 쓰인다.
 */
@Entity
@Table(name = "platform_listings")
@DiscriminatorValue("EXTERNAL")
@PrimaryKeyJoinColumn(name = "listing_id")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlatformListing extends Item {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "platform_id", nullable = false)
    private Platform platform;

    @Column(name = "external_item_id", nullable = false)
    private String externalItemId;

    @Column(nullable = false, length = 50)
    private String status;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "listing_url", columnDefinition = "TEXT")
    private String listingUrl;

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
        super(category, title, price);
        this.platform = platform;
        this.externalItemId = externalItemId;
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
        changeItemInfo(category, title, price);
        this.status = status;
        this.imageUrl = imageUrl;
        this.listingUrl = listingUrl;
        this.lastSeenAt = LocalDateTime.now();
    }

    @Override
    public ListingSource getSource() {
        return ListingSource.EXTERNAL;
    }
}
