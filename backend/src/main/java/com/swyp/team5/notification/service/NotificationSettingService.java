package com.swyp.team5.notification.service;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.notification.dto.NotificationSettingResponse;
import com.swyp.team5.notification.dto.NotificationSettingUpdateRequest;
import com.swyp.team5.notification.entity.NotificationSetting;
import com.swyp.team5.notification.repository.NotificationSettingRepository;

/** 회원 알림 수신 설정 조회/변경. 설정 행은 처음 바꿀 때 만든다(그 전에는 기본값으로 응답). */
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationSettingService {

    private final NotificationSettingRepository notificationSettingRepository;

    @Transactional(readOnly = true)
    public NotificationSettingResponse getSetting(Long memberId) {
        return NotificationSettingResponse.from(notificationSettingRepository
                .findById(memberId)
                .orElseGet(() -> NotificationSetting.defaults(memberId)));
    }

    /** 요청에 담긴 항목만 바꾼다(생략·{@code null} 항목은 유지). */
    public NotificationSettingResponse updateSetting(Long memberId, NotificationSettingUpdateRequest request) {
        NotificationSetting setting = notificationSettingRepository
                .findById(memberId)
                .orElseGet(() -> notificationSettingRepository.save(NotificationSetting.defaults(memberId)));
        setting.update(
                request.recommendationEnabled(),
                request.targetPriceEnabled(),
                request.platformExpiryEnabled(),
                request.marketingEnabled());
        return NotificationSettingResponse.from(setting);
    }
}
