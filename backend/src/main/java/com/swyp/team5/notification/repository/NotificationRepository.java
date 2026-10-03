package com.swyp.team5.notification.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.swyp.team5.notification.entity.Notification;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // 알림 대상의 출처(우리 상품/외부 매물)를 응답에 쓰므로 함께 조회한다(N+1 방지)
    @EntityGraph(attributePaths = "item")
    List<Notification> findByMemberIdAndIdLessThan(Long memberId, Long cursor, Pageable pageable);

    Optional<Notification> findByIdAndMemberId(Long notificationId, Long memberId);

    long countByMemberIdAndReadFalse(Long memberId);

    long countByMemberId(Long memberId);
}
