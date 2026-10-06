package com.swyp.team5.notification.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swyp.team5.notification.entity.Notification;
import com.swyp.team5.notification.entity.NotificationType;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // 알림 대상의 출처(우리 상품/외부 매물)를 응답에 쓰므로 함께 조회한다(N+1 방지)
    @EntityGraph(attributePaths = "item")
    List<Notification> findByMemberIdAndIdLessThan(Long memberId, Long cursor, Pageable pageable);

    Optional<Notification> findByIdAndMemberId(Long notificationId, Long memberId);

    long countByMemberIdAndReadFalse(Long memberId);

    long countByMemberId(Long memberId);

    /** 주어진 대상에 대해 주어진 시각 이후 해당 종류 알림을 받은 회원 ID(시세 변동 알림 하루 1회 제한용). */
    @Query(
            """
            SELECT n.member.id FROM Notification n
            WHERE n.item.id = :itemId AND n.type = :type AND n.createdAt >= :from
            """)
    Set<Long> findMemberIdsNotifiedSince(
            @Param("itemId") Long itemId, @Param("type") NotificationType type, @Param("from") LocalDateTime from);

    long countByMemberIdAndTypeInAndCreatedAtGreaterThanEqual(
            Long memberId, Collection<NotificationType> types, LocalDateTime from);
}
