package com.swyp.team5.crawl.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.swyp.team5.crawl.service.JoongnaPriceCollectionService;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "crawl.joongna", name = "enabled", havingValue = "true")
public class JoongnaPriceCollectionScheduler {

    private final JoongnaPriceCollectionService joongnaPriceCollectionService;

    @Scheduled(cron = "${crawl.joongna.cron}")
    public void collect() {
        try {
            joongnaPriceCollectionService.collectAll();
        } catch (Exception e) {
            log.error("중고나라 시세 수집 중 오류가 발생했습니다.", e);
        }
    }
}
