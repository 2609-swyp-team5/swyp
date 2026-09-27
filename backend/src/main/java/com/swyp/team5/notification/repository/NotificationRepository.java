package com.swyp.team5.notification.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.swyp.team5.notification.entity.Notification;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByMemberId(Long memberId, Pageable pageable);

    Optional<Notification> findByIdAndMemberId(Long notificationId, Long memberId);
}
