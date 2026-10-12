package com.swyp.team5.aichat.entity;

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
import org.hibernate.annotations.CreationTimestamp;

/** 지금이니 AI 대화. {@code updatedAt}은 마지막 메시지 시각으로, 메시지를 저장할 때 {@link #touch()}로 직접 갱신한다. */
@Entity
@Table(name = "ai_chats")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiChat {

    public static final int TITLE_LENGTH = 30;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "chat_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false, length = 100)
    private String title;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private AiChat(Member member, String title) {
        this.member = member;
        this.title = title;
        this.updatedAt = LocalDateTime.now();
    }

    /** 첫 질문으로 대화를 만든다(제목 = 첫 질문 앞 {@value #TITLE_LENGTH}자). */
    public static AiChat start(Member member, String firstQuestion) {
        String stripped = firstQuestion.strip();
        String title = stripped.length() > TITLE_LENGTH ? stripped.substring(0, TITLE_LENGTH) : stripped;
        return new AiChat(member, title);
    }

    public boolean isOwnedBy(Long memberId) {
        return member.getId().equals(memberId);
    }

    /** 새 메시지가 쌓였을 때 최근 대화 목록 정렬용 시각을 갱신한다. */
    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}
