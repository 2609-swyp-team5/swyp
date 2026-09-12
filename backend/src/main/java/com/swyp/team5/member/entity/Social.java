package com.swyp.team5.member.entity;

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

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "socials")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Social {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "social_id")
    private Long id;

    // provider 값 목록이 아직 확정되지 않아 DB 컬럼은 VARCHAR(네이티브 enum 아님)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private SocialProvider provider;

    @Column(name = "provider_id")
    private String providerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private Social(SocialProvider provider, String providerId, Member member) {
        this.provider = provider;
        this.providerId = providerId;
        this.member = member;
    }

    public static Social of(SocialProvider provider, String providerId, Member member) {
        return new Social(provider, providerId, member);
    }
}
