package com.swyp.team5.crawl.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.swyp.team5.crawl.service.PriceCollectionService;

/**
 * 번개장터 시세 수집을 주기 실행한다.
 * 실패해도 재시작 지점 추적 없이 다음 주기에 처음부터 다시 돌지만, 중복 체크로 같은 매물을 반복 집계하지는 않음
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "crawl.bunjang", name = "enabled", havingValue = "true", matchIfMissing = true)
public class PriceCollectionScheduler {

    private final PriceCollectionService priceCollectionService;

    @Scheduled(cron = "${crawl.bunjang.cron}")
    public void collect() {
        try {
            priceCollectionService.collectAll();
        } catch (Exception e) {
            log.error("번개장터 시세 수집 중 오류가 발생했습니다.", e);
        }
    }
}
