package com.swyp.team5.crawl.service;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;

import com.swyp.team5.crawl.client.JoongnaCategoryClient;
import com.swyp.team5.crawl.config.JoongnaCrawlProperties;
import com.swyp.team5.crawl.dto.JoongnaCategoryPage;
import com.swyp.team5.crawl.dto.JoongnaProductItem;
import com.swyp.team5.platform.entity.CategoryPlatform;
import com.swyp.team5.platform.repository.CategoryPlatformRepository;
import com.swyp.team5.product.entity.ProductStatus;

@Slf4j
@Service
@RequiredArgsConstructor
public class JoongnaPriceCollectionService {

    private static final String PLATFORM_NAME = "중고나라";
    private static final String LISTING_URL_TEMPLATE = "https://web.joongna.com/product/%d";
    private static final String SELLING_STATUS = "SELLING";
    private static final int DEFAULT_CATEGORY_DEPTH = 2;

    private final JoongnaCategoryClient joongnaCategoryClient;
    private final CategoryPlatformRepository categoryPlatformRepository;
    private final PlatformListingUpserter platformListingUpserter;
    private final JoongnaCrawlProperties properties;

    public void collectAll() {
        List<CategoryPlatform> mappings =
                categoryPlatformRepository.findCollectTargets(PLATFORM_NAME, ProductStatus.ANALYSIS_TARGETS);
        if (mappings.isEmpty()) {
            log.info("시세 분석 대상 상품이 있는 중고나라 매핑 카테고리가 없어 시세 수집을 건너뜁니다.");
            return;
        }
        Map<String, Integer> depths = joongnaCategoryClient.fetchCategoryDepths();
        Map<String, CategoryPlatform> targets = mappings.stream()
                .sorted(Comparator.comparing(mapping -> mapping.getCategory().getId()))
                .collect(Collectors.toMap(
                        CategoryPlatform::getExternalCategoryId,
                        mapping -> mapping,
                        (first, ignored) -> first,
                        LinkedHashMap::new));
        targets.values()
                .forEach(mapping -> collectCategorySafely(
                        mapping, depths.getOrDefault(mapping.getExternalCategoryId(), DEFAULT_CATEGORY_DEPTH)));
    }

    private void collectCategorySafely(CategoryPlatform mapping, int categoryDepth) {
        try {
            collectCategory(mapping, categoryDepth);
        } catch (Exception e) {
            log.error(
                    "카테고리 {}(중고나라 {}) 시세 수집 중 오류가 발생했습니다.",
                    mapping.getCategory().getId(),
                    mapping.getExternalCategoryId(),
                    e);
        }
    }

    private void collectCategory(CategoryPlatform mapping, int categoryDepth) {
        int count = 0;
        boolean hasMorePages = false;
        for (int page = 0; page < properties.pageLimit(); page++) {
            JoongnaCategoryPage result =
                    joongnaCategoryClient.fetchPage(mapping.getExternalCategoryId(), categoryDepth, page);
            for (JoongnaProductItem item : result.items()) {
                if (!item.isSelling()) {
                    continue;
                }
                upsertListing(mapping, item);
                count++;
            }
            hasMorePages = result.hasNext();
            if (!hasMorePages) {
                break;
            }
        }
        if (hasMorePages) {
            log.warn(
                    "카테고리 {}(중고나라 {}) 매물 {}건 수집 — page-limit({}) 캡에 도달해 더 있는 매물을 못 봤습니다.",
                    mapping.getCategory().getId(),
                    mapping.getExternalCategoryId(),
                    count,
                    properties.pageLimit());
        } else {
            log.info(
                    "카테고리 {}(중고나라 {}) 매물 {}건 수집",
                    mapping.getCategory().getId(),
                    mapping.getExternalCategoryId(),
                    count);
        }
    }

    private void upsertListing(CategoryPlatform mapping, JoongnaProductItem item) {
        platformListingUpserter.upsert(
                mapping.getPlatform(),
                mapping.getCategory(),
                String.valueOf(item.seq()),
                LISTING_URL_TEMPLATE.formatted(item.seq()),
                item.title(),
                item.price(),
                SELLING_STATUS,
                item.url());
    }
}
