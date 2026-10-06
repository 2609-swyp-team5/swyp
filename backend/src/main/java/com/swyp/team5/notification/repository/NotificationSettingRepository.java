package com.swyp.team5.notification.repository;

import java.util.Collection;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swyp.team5.notification.entity.NotificationSetting;

public interface NotificationSettingRepository extends JpaRepository<NotificationSetting, Long> {

    /** 주어진 회원 중 AI 추천 타이밍 알림을 끈 회원 ID(설정 행이 없으면 켜진 것으로 보므로 포함되지 않음). */
    @Query(
            """
            SELECT s.memberId FROM NotificationSetting s
            WHERE s.memberId IN :memberIds AND s.recommendationEnabled = false
            """)
    Set<Long> findRecommendationDisabledMemberIds(@Param("memberIds") Collection<Long> memberIds);

    /** 주어진 회원 중 시세 변동 알림을 끈 회원 ID(설정 행이 없으면 켜진 것으로 보므로 포함되지 않음). */
    @Query(
            """
            SELECT s.memberId FROM NotificationSetting s
            WHERE s.memberId IN :memberIds AND s.priceChangeEnabled = false
            """)
    Set<Long> findPriceChangeDisabledMemberIds(@Param("memberIds") Collection<Long> memberIds);

    /** 목표가 도달 알림을 끈 회원인지(설정 행이 없으면 켜진 것으로 봄). */
    boolean existsByMemberIdAndTargetPriceEnabledFalse(Long memberId);

    /** 플랫폼 연동 만료 알림을 끈 회원인지(설정 행이 없으면 켜진 것으로 봄). */
    boolean existsByMemberIdAndPlatformExpiryEnabledFalse(Long memberId);
}
