package com.swyp.team5.notification.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.swyp.team5.notification.entity.Notification;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByMemberIdAndIdLessThan(Long memberId, Long cursor, Pageable pageable);

    Optional<Notification> findByIdAndMemberId(Long notificationId, Long memberId);
}
