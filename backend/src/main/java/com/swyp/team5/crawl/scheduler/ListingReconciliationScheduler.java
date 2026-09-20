package com.swyp.team5.crawl.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.swyp.team5.crawl.service.ListingReconciliationService;

/** 수집한 데이터(상품) 재확인을 주기적으로 실행한다 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(
        prefix = "crawl.bunjang.reconcile",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = true)
public class ListingReconciliationScheduler {

    private final ListingReconciliationService listingReconciliationService;

    @Scheduled(cron = "${crawl.bunjang.reconcile.cron}")
    public void reconcile() {
        try {
            listingReconciliationService.reconcile();
        } catch (Exception e) {
            log.error("매물 재확인 배치 중 오류가 발생했습니다.", e);
        }
    }
}
