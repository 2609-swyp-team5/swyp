package com.swyp.team5.platform.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformListing;

public interface PlatformListingRepository
        extends JpaRepository<PlatformListing, Long>, JpaSpecificationExecutor<PlatformListing> {

    Optional<PlatformListing> findByPlatformAndExternalItemId(Platform platform, String externalItemId);

    /** 시세 분석용 비교 매물 조회 — 같은 카테고리에서 최근에 관측된 판매중 매물만 가격 오름차순으로 반환한다. */
    List<PlatformListing> findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
            Long categoryId, String status, LocalDateTime lastSeenAtAfter);

    /**
     * 재확인(reconciliation) 대상 조회 — 여전히 판매중으로 기록돼 있지만 한동안 재관측되지 않은(=
     * page-limit 캡에 밀려났을 가능성이 있는) 매물을 오래된 순으로 최대 {@code pageable} 크기만큼 반환한다.
     */
    List<PlatformListing> findByStatusAndLastSeenAtBeforeOrderByLastSeenAtAsc(
            String status, LocalDateTime lastSeenAtBefore, Pageable pageable);
}
