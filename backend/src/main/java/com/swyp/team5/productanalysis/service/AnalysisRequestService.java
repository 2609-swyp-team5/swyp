package com.swyp.team5.productanalysis.service;

import java.time.LocalDateTime;
import java.util.Optional;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.swyp.team5.item.entity.Item;
import com.swyp.team5.item.repository.ItemRepository;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.productanalysis.config.ProductAnalysisProperties;
import com.swyp.team5.productanalysis.dto.AnalysisRequestResponse;
import com.swyp.team5.productanalysis.dto.AnalysisStatus;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.listener.InterestRegisteredAnalysisListener;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;

/**
 * 화면에서 요청한 시세 분석을 실행한다. 외부 매물은 관심 등록된 것만 배치로 분석되므로, 결과가 없는 상품을 사용자가 보려 할 때
 * 바로 분석해 주기 위함이다. 관심 등록 직후 분석과 같은 대기열·규칙({@link ProductAnalysisService#analyzeInterestedItemById})으로
 * 돌려 같은 대상을 동시에 분석하지 않는다. AI 호출이 반복되지 않도록 다음 경우에는 대기열에 넣지 않고 현재 상태만 돌려준다.
 *
 * <ul>
 *   <li>이미 분석 중이거나 분석 대상 상태가 아님(판매완료 등)
 *   <li>최근 {@code analysis.interest-skip-hours}시간(기본 6) 안에 분석 결과가 있음
 *   <li>최근 {@code analysis.request-retry-hours}시간(기본 6) 안에 비교 매물 부족으로 건너뜀(0이면 항상 다시 시도)
 * </ul>
 */
@Slf4j
@Service
public class AnalysisRequestService {

    private final ItemRepository itemRepository;
    private final ProductAnalysisRepository productAnalysisRepository;
    private final ProductAnalysisService productAnalysisService;
    private final ProductAnalysisProperties properties;
    private final ObjectProvider<InterestRegisteredAnalysisListener> analysisQueue;
    private final int retryHours;

    public AnalysisRequestService(
            ItemRepository itemRepository,
            ProductAnalysisRepository productAnalysisRepository,
            ProductAnalysisService productAnalysisService,
            ProductAnalysisProperties properties,
            ObjectProvider<InterestRegisteredAnalysisListener> analysisQueue,
            @Value("${analysis.request-retry-hours:6}") int retryHours) {
        this.itemRepository = itemRepository;
        this.productAnalysisRepository = productAnalysisRepository;
        this.productAnalysisService = productAnalysisService;
        this.properties = properties;
        this.analysisQueue = analysisQueue;
        this.retryHours = retryHours;
    }

    /**
     * 상품(외부 매물 포함) 시세 분석을 요청한다. 분석은 별도 스레드에서 돌고, 결과는 {@code GET /products/{id}/analysis}로 확인한다.
     *
     * @return 요청 후 상태(대기열에 넣었으면 ANALYZING)
     * @throws ProductNotFoundException 존재하지 않는 상품(외부 매물 포함)인 경우
     */
    public AnalysisRequestResponse request(Long productId) {
        Item item = itemRepository.findById(productId).orElseThrow(() -> new ProductNotFoundException(productId));
        Optional<ProductAnalysis> latest = productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(productId);
        AnalysisStatus current = productAnalysisService.analysisStatus(item, latest.isPresent());
        if (current == AnalysisStatus.ANALYZING || current == AnalysisStatus.UNAVAILABLE) {
            return AnalysisRequestResponse.of(item, current);
        }
        LocalDateTime now = LocalDateTime.now();
        if (latest.isPresent() && within(latest.get().getAnalyzedAt(), properties.interestSkipHours(), now)) {
            return AnalysisRequestResponse.of(item, AnalysisStatus.ANALYZED);
        }
        if (current == AnalysisStatus.SKIPPED && within(item.getAnalysisSkippedAt(), retryHours, now)) {
            return AnalysisRequestResponse.of(item, AnalysisStatus.SKIPPED);
        }
        InterestRegisteredAnalysisListener queue = analysisQueue.getIfAvailable();
        if (queue == null) {
            log.info("상품 {}: 관심 등록 직후 분석이 꺼져 있어 분석 요청을 처리하지 않습니다.", productId);
            return AnalysisRequestResponse.of(item, current);
        }
        // 이미 대기 중이면 false지만 그 분석이 곧 결과를 낸다
        queue.enqueue(productId);
        return AnalysisRequestResponse.of(item, AnalysisStatus.ANALYZING);
    }

    /** {@code at}이 최근 {@code hours}시간 안인지(0이면 항상 아님). */
    private static boolean within(LocalDateTime at, int hours, LocalDateTime now) {
        return hours > 0 && at != null && at.isAfter(now.minusHours(hours));
    }
}
