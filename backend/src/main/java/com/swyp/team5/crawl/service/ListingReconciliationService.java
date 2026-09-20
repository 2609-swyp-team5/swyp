package com.swyp.team5.crawl.service;

import java.time.LocalDateTime;
import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.crawl.client.BunjangProductClient;
import com.swyp.team5.crawl.config.ListingReconciliationProperties;
import com.swyp.team5.crawl.dto.BunjangProductDetail;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.PlatformListingRepository;

/**
 * page-limit 캡에 밀려 카테고리 목록 크롤링으로는 더 이상 관측되지 않는 매물을 개별 상세 API로
 * 재확인한다. 여전히 판매중이면 {@code last_seen_at}을 갱신해 살려두고, 삭제/판매완료 등으로 확인되면
 * 그 상태로 기록해 다음 재확인 대상에서 자연스럽게 빠지게 한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ListingReconciliationService {

    private static final String SELLING_STATUS = "SELLING";

    private final BunjangProductClient bunjangProductClient;
    private final PlatformListingRepository platformListingRepository;
    private final ListingReconciliationProperties properties;

    public void reconcile() {
        LocalDateTime staleBefore = LocalDateTime.now().minusHours(properties.staleAfterHours());
        List<PlatformListing> candidates =
                platformListingRepository.findByStatusAndLastSeenAtBeforeOrderByLastSeenAtAsc(
                        SELLING_STATUS,
                        staleBefore,
                        PageRequest.of(
                                0, properties.batchSize(), Sort.by("lastSeenAt").ascending()));
        log.info("매물 재확인 대상 {}건", candidates.size());
        for (PlatformListing listing : candidates) {
            reconcileSafely(listing);
            sleepBetweenCalls();
        }
    }

    private void reconcileSafely(PlatformListing listing) {
        try {
            reconcileOne(listing);
        } catch (Exception e) {
            log.error("매물 {} 재확인 중 오류가 발생했습니다.", listing.getExternalItemId(), e);
        }
    }

    private void sleepBetweenCalls() {
        try {
            Thread.sleep(properties.callIntervalMs());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    /**
     * 상세 API 호출이 확정적인 답(정상 조회 또는 errorCode 있는 에러)을 줬을 때만 이 매물을 갱신한다.
     * 응답이 불확실하면(네트워크 오류 등) {@link BunjangProductClient}가 예외를 던지므로 이 메서드까지
     * 오지 않고, {@link #reconcileSafely}가 아무 것도 갱신하지 않은 채 다음 사이클로 넘긴다.
     */
    @Transactional
    void reconcileOne(PlatformListing listing) {
        BunjangProductDetail detail = bunjangProductClient.fetchDetail(listing.getExternalItemId());
        // 정상 조회면 saleStatus를, 삭제/존재하지 않는 매물이면 errorCode를 그대로 상태값으로 기록한다.
        // 어느 쪽이든 "방금 확인한 최신 상태"이므로 last_seen_at도 함께 갱신한다.
        String newStatus = detail.saleStatus() != null ? detail.saleStatus() : detail.errorCode();
        listing.observe(
                listing.getCategory(),
                detail.title() != null ? detail.title() : listing.getTitle(),
                detail.price() != null ? detail.price() : listing.getPrice(),
                newStatus,
                listing.getImageUrl(),
                listing.getListingUrl());
        platformListingRepository.save(listing);
    }
}
