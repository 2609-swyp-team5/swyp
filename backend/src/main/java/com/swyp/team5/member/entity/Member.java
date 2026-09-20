package com.swyp.team5.member.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "members")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "member_id")
    private Long id;

    // 카카오의 경우 메일을 가져올수 없어서 필수값 제외하겠습니다.
    @Column(unique = true)
    private String email;

    @Column
    private String phone;

    @Column
    private String password;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(name = "profile_image_url")
    private String profileImageUrl;

    @Column(nullable = false, length = 30)
    private String nickname;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "user_role")
    private MemberRole role;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(columnDefinition = "user_status")
    private MemberStatus status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    private Member(String email, String phone, String password, String name, String nickname, String profileImageUrl) {
        this.email = email;
        this.phone = phone;
        this.password = password;
        this.name = name;
        this.nickname = nickname;
        this.profileImageUrl = profileImageUrl;
        this.role = MemberRole.USER;
        this.status = MemberStatus.ACTIVE;
    }

    public static Member ofLocalSignUp(
            String email, String phone, String password, String name, String nickname, String profileImageUrl) {
        return Member.builder()
                .email(email)
                .phone(phone)
                .password(password)
                .name(name)
                .nickname(nickname)
                .profileImageUrl(profileImageUrl)
                .build();
    }

    // 소셜 로그인으로 자동 가입되는 회원은 비밀번호가 없다.
    public static Member ofSocialSignUp(String email, String name, String nickname, String profileImageUrl) {
        return Member.builder()
                .email(email)
                .name(name)
                .nickname(nickname)
                .profileImageUrl(profileImageUrl)
                .build();
    }

    public void changePassword(String encodedPassword) {
        this.password = encodedPassword;
    }
}
