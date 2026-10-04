package com.swyp.team5.notification.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import com.swyp.team5.notification.dto.NotificationSettingResponse;
import com.swyp.team5.notification.dto.NotificationSettingUpdateRequest;
import com.swyp.team5.notification.entity.NotificationSetting;
import com.swyp.team5.notification.repository.NotificationSettingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 알림 수신 설정 Service 단위 테스트.
@ExtendWith(MockitoExtension.class)
class NotificationSettingServiceTest {

    @Mock
    private NotificationSettingRepository notificationSettingRepository;

    private NotificationSettingService service() {
        return new NotificationSettingService(notificationSettingRepository);
    }

    // 설정을 바꾼 적 없으면 기본값(추천·목표가·플랫폼 만료 켜짐, 마케팅 꺼짐)으로 응답하고 행은 만들지 않음
    @Test
    void returnsDefaultsWhenNeverChanged() {
        when(notificationSettingRepository.findById(1L)).thenReturn(Optional.empty());

        NotificationSettingResponse response = service().getSetting(1L);

        assertThat(response).isEqualTo(new NotificationSettingResponse(true, true, true, true, false));
        verify(notificationSettingRepository, never()).save(any());
    }

    // 처음 바꾸면 기본값으로 행을 만든 뒤 보낸 항목만 바꿈
    @Test
    void createsRowWithDefaultsOnFirstUpdate() {
        when(notificationSettingRepository.findById(1L)).thenReturn(Optional.empty());
        when(notificationSettingRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        NotificationSettingResponse response =
                service().updateSetting(1L, new NotificationSettingUpdateRequest(null, null, false, null, true));

        assertThat(response).isEqualTo(new NotificationSettingResponse(true, true, false, true, true));
    }

    // 이미 있으면 보낸 항목만 바꾸고 생략·null 항목은 유지
    @Test
    void updatesOnlyGivenFields() {
        NotificationSetting setting = NotificationSetting.defaults(1L);
        setting.update(false, null, null, null, true);
        when(notificationSettingRepository.findById(1L)).thenReturn(Optional.of(setting));

        NotificationSettingResponse response =
                service().updateSetting(1L, new NotificationSettingUpdateRequest(null, false, null, false, null));

        assertThat(response).isEqualTo(new NotificationSettingResponse(false, false, true, false, true));
        verify(notificationSettingRepository, never()).save(any());
    }
}
