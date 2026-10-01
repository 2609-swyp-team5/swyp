package com.swyp.team5.interest.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.swyp.team5.interest.service.TargetPriceAlertService;

/** 관심상품 목표가 도달 여부를 주기적으로 확인한다(외부 매물 가격은 수집 배치가 바꾸므로 그 뒤에 확인). */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(
        prefix = "interest.target-price-alert",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = true)
public class TargetPriceAlertScheduler {

    private final TargetPriceAlertService targetPriceAlertService;

    // 기본: 매시 10분(매시 정각 수집 배치 이후)
    @Scheduled(cron = "${interest.target-price-alert.cron:0 10 * * * *}")
    public void check() {
        try {
            targetPriceAlertService.checkAll();
        } catch (Exception e) {
            log.error("목표가 도달 알림 배치 중 오류가 발생했습니다.", e);
        }
    }
}
