package com.swyp.team5.productanalysis.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.swyp.team5.productanalysis.service.ProductAnalysisService;

/** 시세 분석을 주기 실행한다(크론은 크롤링 주기와 별도로 설정, 크롤링이 여러 번 돈 뒤 하루 단위로 실행 권장). */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "analysis", name = "enabled", havingValue = "true", matchIfMissing = true)
public class ProductAnalysisScheduler {

    private final ProductAnalysisService productAnalysisService;

    @Scheduled(cron = "${analysis.cron}")
    public void analyze() {
        try {
            productAnalysisService.analyzeAll();
        } catch (Exception e) {
            log.error("시세 분석 배치 중 오류가 발생했습니다.", e);
        }
    }
}
