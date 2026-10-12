package com.swyp.team5.aichat.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swyp.team5.aichat.entity.AiChatMessage;

public interface AiChatMessageRepository extends JpaRepository<AiChatMessage, Long> {

    List<AiChatMessage> findByChatIdOrderByIdAsc(Long chatId);

    /** 다시 만들기 — 지정 메시지와 그 뒤 메시지를 모두 지운다. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM AiChatMessage m WHERE m.chat.id = :chatId AND m.id >= :fromId")
    int deleteFrom(@Param("chatId") Long chatId, @Param("fromId") Long fromId);
}
