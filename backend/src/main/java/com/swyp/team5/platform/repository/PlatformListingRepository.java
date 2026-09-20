package com.swyp.team5.platform.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformListing;

public interface PlatformListingRepository extends JpaRepository<PlatformListing, Long> {

    Optional<PlatformListing> findByPlatformAndExternalItemId(Platform platform, String externalItemId);

    /** 시세 분석용 비교 매물 조회 — 같은 카테고리에서 최근에 관측된 판매중 매물만 가격 오름차순으로 반환한다. */
    List<PlatformListing> findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
            Long categoryId, String status, LocalDateTime lastSeenAtAfter);
}
