package com.swyp.team5.crawl.service;

import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.crawl.client.BunjangCategoryClient;
import com.swyp.team5.crawl.config.BunjangCrawlProperties;
import com.swyp.team5.crawl.dto.BunjangCategoryPage;
import com.swyp.team5.crawl.dto.BunjangProductItem;
import com.swyp.team5.platform.entity.CategoryPlatform;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.CategoryPlatformRepository;
import com.swyp.team5.platform.repository.PlatformListingRepository;

/**
 * 번개장터 카테고리별 매물을 광범위 수집해 {@link PlatformListing}으로 upsert한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PriceCollectionService {

    private static final String PLATFORM_NAME = "번개장터"; // 현재는 번개장터만 수집하므로 상수로 고정
    private static final String LISTING_URL_TEMPLATE = "https://m.bunjang.co.kr/products/%d";

    private static final String SELLING_STATUS = "SELLING";

    private final BunjangCategoryClient bunjangCategoryClient;
    private final CategoryPlatformRepository categoryPlatformRepository;
    private final PlatformListingRepository platformListingRepository;
    private final BunjangCrawlProperties properties;

    /** 등록된 카테고리 전체를 순회하며 수집한다. 매핑이 없으면 아무 것도 하지 않는다. */
    public void collectAll() {
        List<CategoryPlatform> mappings = categoryPlatformRepository.findByPlatformName(PLATFORM_NAME);
        if (mappings.isEmpty()) {
            log.info("번개장터 카테고리 매핑이 비어있어 시세 수집을 건너뜁니다.");
            return;
        }
        mappings.forEach(this::collectCategorySafely);
    }

    /** 카테고리 하나가 실패해도 다른 카테고리는 계속 수집하도록 예외를 격리한다. */
    private void collectCategorySafely(CategoryPlatform mapping) {
        try {
            collectCategory(mapping);
        } catch (Exception e) {
            log.error(
                    "카테고리 {}(번개장터 {}) 시세 수집 중 오류가 발생했습니다.",
                    mapping.getCategory().getId(),
                    mapping.getExternalCategoryId(),
                    e);
        }
    }

    private void collectCategory(CategoryPlatform mapping) {
        Long categoryId = mapping.getCategory().getId();
        String bunjangCategoryId = mapping.getExternalCategoryId();
        int count = 0;
        String cursor = null;
        for (int page = 0; page < properties.pageLimit(); page++) {
            BunjangCategoryPage result = bunjangCategoryClient.fetchPage(bunjangCategoryId, cursor);
            for (BunjangProductItem item : result.items()) {
                if (item.ad()) {
                    continue; // 광고 매물은 검색 연관도/입찰가로 노출돼 시세를 왜곡할 수 있어 제외
                }
                if (!SELLING_STATUS.equals(item.status())) {
                    continue; // 판매중이 아닌 매물(판매완료/예약중 등)은 현재 시세가 아니므로 제외
                }
                upsertListing(mapping, item);
                count++;
            }
            if (!result.hasNext()) {
                break;
            }
            cursor = result.nextCursor();
        }
        log.info("카테고리 {}(번개장터 {}) 매물 {}건 수집", categoryId, bunjangCategoryId, count);
    }

    /**
     * 매물을 {@code (platform, externalItemId)} 기준으로 upsert한다. 이미 있으면 관측값만 갱신한다.
     *
     * <p>{@code findByPlatformAndExternalItemId}/{@code save}가 각자 별도 트랜잭션으로 실행돼 조회 결과가
     * 영속성 컨텍스트 밖(detached)이므로, 갱신 시에도 dirty checking에 기대지 않고 명시적으로 {@code save}
     * 를 호출한다(detached 엔티티의 {@code save}는 merge로 동작).
     */
    private void upsertListing(CategoryPlatform mapping, BunjangProductItem item) {
        Platform platform = mapping.getPlatform();
        Category category = mapping.getCategory();
        String externalItemId = String.valueOf(item.pid());
        String listingUrl = LISTING_URL_TEMPLATE.formatted(item.pid());

        PlatformListing listing = platformListingRepository
                .findByPlatformAndExternalItemId(platform, externalItemId)
                .orElseGet(() -> PlatformListing.create(
                        platform,
                        category,
                        externalItemId,
                        item.name(),
                        item.price(),
                        item.status(),
                        item.productImage(),
                        listingUrl));
        listing.observe(category, item.name(), item.price(), item.status(), item.productImage(), listingUrl);
        platformListingRepository.save(listing);
    }
}
