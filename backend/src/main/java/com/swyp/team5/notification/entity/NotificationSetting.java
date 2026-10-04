package com.swyp.team5.notification.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * 회원별 알림 수신 설정. 행이 없는 회원은 {@link #defaults(Long)}와 같은 설정으로 본다. 실제 발송에 반영되는 것은 AI 추천 타이밍
 * 알림({@code recommendationEnabled})과 목표가 도달 알림({@code targetPriceEnabled})이고, 나머지는 해당 알림 기능이 생기기
 * 전까지 저장만 한다. 공지(NOTICE)는 설정과 무관하게 항상 보낸다.
 */
@Entity
@Table(name = "notification_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NotificationSetting {

    @Id
    @Column(name = "member_id")
    private Long memberId;

    @Column(name = "recommendation_enabled", nullable = false)
    private boolean recommendationEnabled; // AI 추천 타이밍 알림(SELL/HOLD/BUY/WAIT)

    @Column(name = "price_change_enabled", nullable = false)
    private boolean priceChangeEnabled; // 시세 변동 알림

    @Column(name = "target_price_enabled", nullable = false)
    private boolean targetPriceEnabled; // 목표가 도달 알림(TARGET_PRICE)

    @Column(name = "platform_expiry_enabled", nullable = false)
    private boolean platformExpiryEnabled; // 플랫폼 연동 만료 알림

    @Column(name = "marketing_enabled", nullable = false)
    private boolean marketingEnabled; // 마케팅·이벤트 알림

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private NotificationSetting(Long memberId) {
        this.memberId = memberId;
        this.recommendationEnabled = true;
        this.priceChangeEnabled = true;
        this.targetPriceEnabled = true;
        this.platformExpiryEnabled = true;
        this.marketingEnabled = false;
    }

    /** 기본 설정(V30·V31 컬럼 기본값과 같음). */
    public static NotificationSetting defaults(Long memberId) {
        return new NotificationSetting(memberId);
    }

    /** {@code null}이 아닌 항목만 바꾼다. */
    public void update(
            Boolean recommendationEnabled,
            Boolean priceChangeEnabled,
            Boolean targetPriceEnabled,
            Boolean platformExpiryEnabled,
            Boolean marketingEnabled) {
        if (recommendationEnabled != null) {
            this.recommendationEnabled = recommendationEnabled;
        }
        if (priceChangeEnabled != null) {
            this.priceChangeEnabled = priceChangeEnabled;
        }
        if (targetPriceEnabled != null) {
            this.targetPriceEnabled = targetPriceEnabled;
        }
        if (platformExpiryEnabled != null) {
            this.platformExpiryEnabled = platformExpiryEnabled;
        }
        if (marketingEnabled != null) {
            this.marketingEnabled = marketingEnabled;
        }
    }
}
