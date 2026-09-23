package com.swyp.team5.platform.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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

import com.swyp.team5.common.crypto.EncryptedStringConverter;
import com.swyp.team5.member.entity.Member;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

/**
 * 회원-외부 플랫폼(번개장터 등) 세션 연동 정보. {@code sessionToken}은 타 서비스 로그인 정보를
 * 대신하는 민감 값이라 {@link EncryptedStringConverter}로 암호화되어 저장된다.
 */
@Entity
@Table(name = "member_platforms")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberPlatform {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "member_platform_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "platform_id", nullable = false)
    private Platform platform;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "session_token", columnDefinition = "TEXT")
    private String sessionToken;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "member_platform_status")
    private MemberPlatformStatus status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private MemberPlatform(Member member, Platform platform, String sessionToken) {
        this.member = member;
        this.platform = platform;
        this.sessionToken = sessionToken;
        this.status = MemberPlatformStatus.CONNECTED;
    }

    public static MemberPlatform connect(Member member, Platform platform, String sessionToken) {
        return new MemberPlatform(member, platform, sessionToken);
    }

    /** 세션을 갱신하고 상태를 다시 {@code CONNECTED}로 되돌린다(재연동 시 사용). */
    public void reconnect(String sessionToken) {
        this.sessionToken = sessionToken;
        this.status = MemberPlatformStatus.CONNECTED;
    }

    public void markExpired() {
        this.status = MemberPlatformStatus.EXPIRED;
    }

    public void disconnect() {
        this.sessionToken = null;
        this.status = MemberPlatformStatus.DISCONNECTED;
    }

    public boolean isRegisteredBy(Long memberId) {
        return this.member.getId().equals(memberId);
    }
}
