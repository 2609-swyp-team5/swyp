package com.swyp.team5.productanalysis.scheduler;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.productanalysis.listener.InterestRegisteredAnalysisListener;
import com.swyp.team5.productanalysis.listener.ProductRegisteredAnalysisListener;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;
import com.swyp.team5.productanalysis.service.AnalysisProgressTracker;

/**
 * 등록·관심 등록 직후 분석이 사라진 대상을 다시 분석 대기열에 넣는다. 직후 분석 대기열은 메모리에만 있어 재배포·재시작하면 사라지고,
 * AI 호출 오류로 실패해도 다음 정기 배치(6시간)까지 분석대기로 남기 때문이다. 최근 {@code analysis.recovery.window-hours}시간
 * (기본 24) 안에 등록·관심 등록됐는데 분석 결과도, 분석을 건너뛴 기록도 없는 대상을 기동 직후와 이후
 * {@code analysis.recovery.interval}(기본 30분)마다 찾는다. 이미 분석 중인 대상은 넣지 않는다. 각 직후 분석이 꺼져 있으면 그
 * 쪽은 복구하지 않는다.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "analysis.recovery", name = "enabled", havingValue = "true", matchIfMissing = true)
public class PendingAnalysisRecoveryScheduler {

    private final ProductAnalysisRepository productAnalysisRepository;
    private final AnalysisProgressTracker progressTracker;
    private final ObjectProvider<ProductRegisteredAnalysisListener> productListener;
    private final ObjectProvider<InterestRegisteredAnalysisListener> interestListener;
    private final int windowHours;

    public PendingAnalysisRecoveryScheduler(
            ProductAnalysisRepository productAnalysisRepository,
            AnalysisProgressTracker progressTracker,
            ObjectProvider<ProductRegisteredAnalysisListener> productListener,
            ObjectProvider<InterestRegisteredAnalysisListener> interestListener,
            @Value("${analysis.recovery.window-hours:24}") int windowHours) {
        this.productAnalysisRepository = productAnalysisRepository;
        this.progressTracker = progressTracker;
        this.productListener = productListener;
        this.interestListener = interestListener;
        this.windowHours = windowHours;
    }

    @Scheduled(
            initialDelayString = "${analysis.recovery.initial-delay:PT1M}",
            fixedDelayString = "${analysis.recovery.interval:PT30M}")
    public void recover() {
        try {
            recoverPending();
        } catch (Exception e) {
            log.error("분석대기 대상 복구 중 오류가 발생했습니다.", e);
        }
    }

    void recoverPending() {
        LocalDateTime since = LocalDateTime.now().minusHours(windowHours);
        Set<Long> productIds = new HashSet<>();

        ProductRegisteredAnalysisListener products = productListener.getIfAvailable();
        if (products != null) {
            List<Long> pending = notInProgress(
                    productAnalysisRepository.findUnanalyzedProductIds(ProductStatus.ANALYSIS_TARGETS, since));
            productIds.addAll(pending);
            long queued = pending.stream().filter(products::enqueue).count();
            if (queued > 0) {
                log.info("분석되지 않은 등록 상품 {}건을 다시 분석 대기열에 넣었습니다.", queued);
            }
        }

        InterestRegisteredAnalysisListener interests = interestListener.getIfAvailable();
        if (interests != null) {
            List<Long> pending =
                    new ArrayList<>(notInProgress(productAnalysisRepository.findUnanalyzedInterestedItemIds(since)));
            // 등록 상품 쪽에서 이미 넣은 상품은 같은 상품을 동시에 분석하지 않도록 뺀다
            pending.removeAll(productIds);
            long queued = pending.stream().filter(interests::enqueue).count();
            if (queued > 0) {
                log.info("분석되지 않은 관심 대상 {}건을 다시 분석 대기열에 넣었습니다.", queued);
            }
        }
    }

    private List<Long> notInProgress(List<Long> itemIds) {
        if (itemIds.isEmpty()) {
            return itemIds;
        }
        Set<Long> running = progressTracker.inProgressAmong(itemIds);
        return itemIds.stream().filter(id -> !running.contains(id)).toList();
    }
}
