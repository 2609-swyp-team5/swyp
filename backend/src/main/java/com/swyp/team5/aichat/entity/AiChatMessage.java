package com.swyp.team5.aichat.entity;

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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

/** 대화 안의 질문(USER) 또는 답변(ASSISTANT). 답변만 의도·카드 데이터를 가진다. */
@Entity
@Table(name = "ai_chat_messages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_id", nullable = false)
    private AiChat chat;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AiChatRole role;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private AiChatIntent intent;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private AiChatPayload payload;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private AiChatMessage(AiChat chat, AiChatRole role, String content, AiChatIntent intent, AiChatPayload payload) {
        this.chat = chat;
        this.role = role;
        this.content = content;
        this.intent = intent;
        this.payload = payload;
    }

    public static AiChatMessage question(AiChat chat, String content) {
        return new AiChatMessage(chat, AiChatRole.USER, content.strip(), null, null);
    }

    public static AiChatMessage answer(AiChat chat, String content, AiChatIntent intent, AiChatPayload payload) {
        return new AiChatMessage(chat, AiChatRole.ASSISTANT, content, intent, payload);
    }

    public boolean isQuestion() {
        return role == AiChatRole.USER;
    }

    /** 질문 수정(답변 다시 만들기 전에 질문 내용을 바꿀 때). */
    public void editQuestion(String content) {
        this.content = content.strip();
    }
}
