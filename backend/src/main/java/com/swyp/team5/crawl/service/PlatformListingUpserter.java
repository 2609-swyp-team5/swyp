package com.swyp.team5.crawl.service;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.PlatformListingRepository;

/** 번개장터 매물을 {@code (platform, externalItemId)} 기준으로 upsert한다(카테고리 수집·키워드 검색 공용). */
@Component
@RequiredArgsConstructor
public class PlatformListingUpserter {

    private static final String LISTING_URL_TEMPLATE = "https://m.bunjang.co.kr/products/%d";

    private final PlatformListingRepository platformListingRepository;

    /**
     * 이미 있으면 관측값만 갱신하고 없으면 새로 만든다.
     *
     * <p>{@code findByPlatformAndExternalItemId}/{@code save}가 각자 별도 트랜잭션으로 실행돼 조회 결과가
     * 영속성 컨텍스트 밖(detached)이므로, 갱신 시에도 dirty checking에 기대지 않고 명시적으로 {@code save}
     * 를 호출한다(detached 엔티티의 {@code save}는 merge로 동작).
     *
     * @return 저장된 매물(ID 포함)
     */
    public PlatformListing upsert(
            Platform platform, Category category, long pid, String name, long price, String status, String imageUrl) {
        return upsert(platform, category, pid, name, price, status, imageUrl, true);
    }

    /**
     * {@link #upsert}와 같되, 이미 있는 매물의 카테고리는 바꾸지 않는다(새 매물만 {@code category}로 저장). 키워드 검색 API는 카테고리
     * 수집과 다른(더 세분된) 카테고리 ID를 주므로, 수집이 정한 카테고리를 검색이 덮어써 둘이 번갈아 바꾸지 않도록 한다.
     */
    public PlatformListing upsertKeepingCategory(
            Platform platform, Category category, long pid, String name, long price, String status, String imageUrl) {
        return upsert(platform, category, pid, name, price, status, imageUrl, false);
    }

    private PlatformListing upsert(
            Platform platform,
            Category category,
            long pid,
            String name,
            long price,
            String status,
            String imageUrl,
            boolean overwriteCategory) {
        String externalItemId = String.valueOf(pid);
        String listingUrl = LISTING_URL_TEMPLATE.formatted(pid);

        PlatformListing listing = platformListingRepository
                .findByPlatformAndExternalItemId(platform, externalItemId)
                .orElseGet(() -> PlatformListing.create(
                        platform, category, externalItemId, name, price, status, imageUrl, listingUrl));
        Category observedCategory = overwriteCategory || listing.getId() == null ? category : listing.getCategory();
        listing.observe(observedCategory, name, price, status, imageUrl, listingUrl);
        return platformListingRepository.save(listing);
    }
}
