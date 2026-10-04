package com.swyp.team5.crawl.service;

import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;

import com.swyp.team5.crawl.client.BunjangCategoryClient;
import com.swyp.team5.crawl.config.BunjangCrawlProperties;
import com.swyp.team5.crawl.dto.BunjangCategoryPage;
import com.swyp.team5.crawl.dto.BunjangProductItem;
import com.swyp.team5.platform.entity.CategoryPlatform;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.CategoryPlatformRepository;
import com.swyp.team5.product.entity.ProductStatus;

/**
 * 번개장터 카테고리별 매물을 광범위 수집해 {@link PlatformListing}으로 upsert한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PriceCollectionService {

    private static final String PLATFORM_NAME = "번개장터"; // 현재는 번개장터만 수집하므로 상수로 고정

    private static final String SELLING_STATUS = "SELLING";

    private final BunjangCategoryClient bunjangCategoryClient;
    private final CategoryPlatformRepository categoryPlatformRepository;
    private final PlatformListingUpserter platformListingUpserter;
    private final BunjangCrawlProperties properties;

    /** 시세 분석 대상(등록됨·판매중) 우리 상품이 있는 카테고리만 순회하며 수집한다. 대상이 없으면 아무 것도 하지 않는다. */
    public void collectAll() {
        List<CategoryPlatform> mappings =
                categoryPlatformRepository.findCollectTargets(PLATFORM_NAME, ProductStatus.ANALYSIS_TARGETS);
        if (mappings.isEmpty()) {
            log.info("시세 분석 대상 상품이 있는 번개장터 매핑 카테고리가 없어 시세 수집을 건너뜁니다.");
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
        boolean hasMorePages = false;
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
            hasMorePages = result.hasNext();
            if (!hasMorePages) {
                break;
            }
            cursor = result.nextCursor();
        }
        // hasMorePages가 여전히 true면 hasNext=false로 자연 종료한 게 아니라 page-limit 캡에 걸려
        // 강제 종료된 것 — 이 경우 아직 못 본 매물이 남아있다는 뜻이라 WARN으로 구분해 남긴다.
        if (hasMorePages) {
            log.warn(
                    "카테고리 {}(번개장터 {}) 매물 {}건 수집 — page-limit({}) 캡에 도달해 더 있는 매물을 못 봤습니다.",
                    categoryId,
                    bunjangCategoryId,
                    count,
                    properties.pageLimit());
        } else {
            log.info("카테고리 {}(번개장터 {}) 매물 {}건 수집", categoryId, bunjangCategoryId, count);
        }
    }

    private void upsertListing(CategoryPlatform mapping, BunjangProductItem item) {
        platformListingUpserter.upsert(
                mapping.getPlatform(),
                mapping.getCategory(),
                item.pid(),
                item.name(),
                item.price(),
                item.status(),
                item.productImage());
    }
}
