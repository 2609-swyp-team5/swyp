package com.swyp.team5.aichat.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swyp.team5.aichat.entity.AiChat;

public interface AiChatRepository extends JpaRepository<AiChat, Long> {

    /** 최근 대화 목록 첫 페이지(마지막 메시지 시각 내림차순, 같으면 ID 내림차순). */
    @Query("SELECT c FROM AiChat c WHERE c.member.id = :memberId ORDER BY c.updatedAt DESC, c.id DESC")
    List<AiChat> findRecent(@Param("memberId") Long memberId, Pageable pageable);

    /** 최근 대화 목록 다음 페이지 — 커서(마지막 항목의 updatedAt·id)보다 뒤에 오는 대화. */
    @Query(
            """
            SELECT c FROM AiChat c
            WHERE c.member.id = :memberId
              AND (c.updatedAt < :updatedAt OR (c.updatedAt = :updatedAt AND c.id < :id))
            ORDER BY c.updatedAt DESC, c.id DESC
            """)
    List<AiChat> findRecentAfter(
            @Param("memberId") Long memberId,
            @Param("updatedAt") LocalDateTime updatedAt,
            @Param("id") Long id,
            Pageable pageable);

    long countByMemberId(Long memberId);

    /** 회원의 대화를 모두 지운다(메시지는 DB ON DELETE CASCADE로 함께 삭제). */
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM AiChat c WHERE c.member.id = :memberId")
    int deleteAllByMemberId(@Param("memberId") Long memberId);
}
