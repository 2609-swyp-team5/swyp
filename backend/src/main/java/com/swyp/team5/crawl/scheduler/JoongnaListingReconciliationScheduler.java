package com.swyp.team5.crawl.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.swyp.team5.crawl.service.JoongnaListingReconciliationService;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "crawl.joongna", name = "enabled", havingValue = "true")
public class JoongnaListingReconciliationScheduler {

    private final JoongnaListingReconciliationService joongnaListingReconciliationService;

    @Scheduled(cron = "${crawl.joongna.reconcile-cron}")
    public void reconcile() {
        try {
            joongnaListingReconciliationService.reconcile();
        } catch (Exception e) {
            log.error("중고나라 매물 재확인 배치 중 오류가 발생했습니다.", e);
        }
    }
}
