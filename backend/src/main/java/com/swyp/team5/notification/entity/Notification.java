package com.swyp.team5.notification.entity;

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

import com.swyp.team5.item.entity.Item;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.product.entity.Product;
import org.hibernate.Hibernate;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "notifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id")
    private Item item; // 알림 대상(우리 상품 또는 외부 매물), 공지성 알림 등 상품과 무관하면 null

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "notification_type")
    private NotificationType type;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "is_read", nullable = false)
    private boolean read;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private Notification(Member member, Item item, NotificationType type, String title, String message) {
        this.member = member;
        this.item = item;
        this.type = type;
        this.title = title;
        this.message = message;
        this.read = false;
    }

    public static Notification create(
            Member member, Product product, NotificationType type, String title, String message) {
        return new Notification(member, product, type, title, message);
    }

    /** 관심 등록된 외부 매물 대상 알림을 생성한다. */
    public static Notification createForListing(
            Member member, PlatformListing listing, NotificationType type, String title, String message) {
        return new Notification(member, listing, type, title, message);
    }

    /** 상품과 무관한 회원 알림(연동 만료 등)을 생성한다. */
    public static Notification createForMember(Member member, NotificationType type, String title, String message) {
        return new Notification(member, null, type, title, message);
    }

    /** 대상이 우리 상품이면 그 상품, 외부 매물이면 {@code null}. */
    public Product getProduct() {
        return Hibernate.unproxy(item) instanceof Product product ? product : null;
    }

    /** 대상이 외부 매물이면 그 매물, 우리 상품이면 {@code null}. */
    public PlatformListing getListing() {
        return Hibernate.unproxy(item) instanceof PlatformListing listing ? listing : null;
    }

    public void markRead() {
        this.read = true;
    }
}
