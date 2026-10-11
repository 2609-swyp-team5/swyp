package com.swyp.team5.productanalysis.service;

import java.time.LocalDateTime;
import java.util.Optional;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.swyp.team5.item.entity.Item;
import com.swyp.team5.item.repository.ItemRepository;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.error.ProductAccessDeniedException;
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
 *
 * <p>판매자가 자기 상품을 강제로 재분석하면({@code force}) 위 두 시간 제한 대신 {@code analysis.force-retry-minutes}분(기본 10)
 * 안에 분석했거나 건너뛴 경우만 막는다.
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
    private final int forceRetryMinutes;

    public AnalysisRequestService(
            ItemRepository itemRepository,
            ProductAnalysisRepository productAnalysisRepository,
            ProductAnalysisService productAnalysisService,
            ProductAnalysisProperties properties,
            ObjectProvider<InterestRegisteredAnalysisListener> analysisQueue,
            @Value("${analysis.request-retry-hours:6}") int retryHours,
            @Value("${analysis.force-retry-minutes:10}") int forceRetryMinutes) {
        this.itemRepository = itemRepository;
        this.productAnalysisRepository = productAnalysisRepository;
        this.productAnalysisService = productAnalysisService;
        this.properties = properties;
        this.analysisQueue = analysisQueue;
        this.retryHours = retryHours;
        this.forceRetryMinutes = forceRetryMinutes;
    }

    /**
     * 상품(외부 매물 포함) 시세 분석을 요청한다. 분석은 별도 스레드에서 돌고, 결과는 {@code GET /products/{id}/analysis}로 확인한다.
     *
     * @return 요청 후 상태(대기열에 넣었으면 ANALYZING)
     * @throws ProductNotFoundException 존재하지 않는 상품(외부 매물 포함)인 경우
     */
    public AnalysisRequestResponse request(Long productId) {
        return request(productId, null, false);
    }

    /**
     * 시세 분석을 요청한다. {@code force}면 판매자 본인 상품만 최근 분석 여부와 관계없이 다시 분석한다(최소 간격
     * {@code analysis.force-retry-minutes}분).
     *
     * @param memberId 요청한 회원 ID({@code force}일 때 판매자 확인용)
     * @param force true면 최근 분석·건너뜀 시간 제한을 무시하고 다시 분석
     * @return 요청 후 상태(대기열에 넣었으면 ANALYZING)
     * @throws ProductNotFoundException 존재하지 않는 상품(외부 매물 포함)인 경우
     * @throws ProductAccessDeniedException {@code force}인데 요청 회원의 상품이 아닌 경우(외부 매물 포함)
     */
    public AnalysisRequestResponse request(Long productId, Long memberId, boolean force) {
        Item item = itemRepository.findById(productId).orElseThrow(() -> new ProductNotFoundException(productId));
        if (force && !(item instanceof Product product && product.isRegisteredBy(memberId))) {
            throw new ProductAccessDeniedException(productId);
        }
        Optional<ProductAnalysis> latest = productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(productId);
        AnalysisStatus current = productAnalysisService.analysisStatus(item, latest.isPresent());
        if (current == AnalysisStatus.ANALYZING || current == AnalysisStatus.UNAVAILABLE) {
            return AnalysisRequestResponse.of(item, current);
        }
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime analyzedAt = latest.map(ProductAnalysis::getAnalyzedAt).orElse(null);
        boolean analyzedRecently = force
                ? withinMinutes(analyzedAt, forceRetryMinutes, now)
                : within(analyzedAt, properties.interestSkipHours(), now);
        if (analyzedRecently) {
            return AnalysisRequestResponse.of(item, AnalysisStatus.ANALYZED);
        }
        boolean skippedRecently = force
                ? withinMinutes(item.getAnalysisSkippedAt(), forceRetryMinutes, now)
                : within(item.getAnalysisSkippedAt(), retryHours, now);
        if (current == AnalysisStatus.SKIPPED && skippedRecently) {
            return AnalysisRequestResponse.of(item, AnalysisStatus.SKIPPED);
        }
        InterestRegisteredAnalysisListener queue = analysisQueue.getIfAvailable();
        if (queue == null) {
            log.info("상품 {}: 관심 등록 직후 분석이 꺼져 있어 분석 요청을 처리하지 않습니다.", productId);
            return AnalysisRequestResponse.of(item, current);
        }
        // 이미 대기 중이면 false지만 그 분석이 곧 결과를 낸다
        queue.enqueue(productId, force);
        return AnalysisRequestResponse.of(item, AnalysisStatus.ANALYZING);
    }

    /** {@code at}이 최근 {@code hours}시간 안인지(0이면 항상 아님). */
    private static boolean within(LocalDateTime at, int hours, LocalDateTime now) {
        return hours > 0 && at != null && at.isAfter(now.minusHours(hours));
    }

    /** {@code at}이 최근 {@code minutes}분 안인지(0이면 항상 아님). */
    private static boolean withinMinutes(LocalDateTime at, int minutes, LocalDateTime now) {
        return minutes > 0 && at != null && at.isAfter(now.minusMinutes(minutes));
    }
}
