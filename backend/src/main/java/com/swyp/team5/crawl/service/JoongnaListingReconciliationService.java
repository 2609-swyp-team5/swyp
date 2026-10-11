package com.swyp.team5.crawl.service;

import java.time.LocalDateTime;
import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.swyp.team5.crawl.client.JoongnaProductClient;
import com.swyp.team5.crawl.config.ListingReconciliationProperties;
import com.swyp.team5.crawl.dto.JoongnaProductDetail;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.PlatformListingRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class JoongnaListingReconciliationService {

    private static final String PLATFORM_NAME = "중고나라";
    private static final List<String> ACTIVE_STATUSES = List.of("SELLING", "RESERVED");

    private final JoongnaProductClient joongnaProductClient;
    private final PlatformListingRepository platformListingRepository;
    private final ListingReconciliationProperties properties;

    public void reconcile() {
        LocalDateTime staleBefore = LocalDateTime.now().minusHours(properties.staleAfterHours());
        List<PlatformListing> candidates =
                platformListingRepository.findByPlatform_NameAndStatusInAndLastSeenAtBeforeOrderByLastSeenAtAsc(
                        PLATFORM_NAME,
                        ACTIVE_STATUSES,
                        staleBefore,
                        PageRequest.of(
                                0, properties.batchSize(), Sort.by("lastSeenAt").ascending()));
        log.info("중고나라 매물 재확인 대상 {}건", candidates.size());
        for (PlatformListing listing : candidates) {
            reconcileSafely(listing);
            sleepBetweenCalls();
        }
    }

    private void reconcileSafely(PlatformListing listing) {
        try {
            JoongnaProductDetail detail = joongnaProductClient.fetchDetail(listing.getExternalItemId());
            listing.observe(
                    listing.getCategory(),
                    detail.title() != null ? detail.title() : listing.getTitle(),
                    detail.price() != null ? detail.price() : listing.getPrice(),
                    detail.status(),
                    listing.getImageUrl(),
                    listing.getListingUrl());
            platformListingRepository.save(listing);
        } catch (Exception e) {
            log.error("중고나라 매물 {} 재확인 중 오류가 발생했습니다.", listing.getExternalItemId(), e);
        }
    }

    private void sleepBetweenCalls() {
        try {
            Thread.sleep(properties.callIntervalMs());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
