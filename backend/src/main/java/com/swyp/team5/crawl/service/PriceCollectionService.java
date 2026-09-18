package com.swyp.team5.crawl.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.OptionalDouble;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.swyp.team5.crawl.client.BunjangCategoryClient;
import com.swyp.team5.crawl.client.dto.BunjangCategoryPage;
import com.swyp.team5.crawl.client.dto.BunjangProductItem;
import com.swyp.team5.crawl.config.BunjangCrawlProperties;
import com.swyp.team5.platform.entity.CategoryPlatform;
import com.swyp.team5.platform.repository.CategoryPlatformRepository;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;

/**
 * 번개장터 카테고리별 매물을 광범위 수집해 카테고리 단위 시세 통계(평균/최저/최고가)를 계산하고,
 * 같은 카테고리에 등록된 상품마다 {@link ProductAnalysis} 스냅샷으로 저장한다.
 *
 * <p>1차 구현 스코프(2026-09-18 확정): 상품명 단위 매칭·이상치 필터링·판단(recommendation) 로직은
 * 다루지 않는다(PROGRESS.md "다음 작업" 2·3번 참고). 원시 매물 데이터는 저장하지 않고 집계된
 * 통계만 남긴다. API 기술 세부사항은 docs/시세수집-번개장터-API-참고.md 참고.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PriceCollectionService {

    private static final String SEEN_KEY_PREFIX = "crawl:bunjang:seen:";
    private static final String PRICE_CACHE_KEY_PREFIX = "crawl:bunjang:price:";
    private static final String PLATFORM_NAME = "번개장터";

    private final BunjangCategoryClient bunjangCategoryClient;
    private final ProductRepository productRepository;
    private final ProductAnalysisRepository productAnalysisRepository;
    private final CategoryPlatformRepository categoryPlatformRepository;
    private final StringRedisTemplate redisTemplate;
    private final BunjangCrawlProperties properties;

    /** 등록된 카테고리 매핑(category_platforms) 전체를 순회하며 수집한다. 매핑이 없으면 아무 것도 하지 않는다. */
    public void collectAll() {
        List<CategoryPlatform> mappings = categoryPlatformRepository.findByPlatformName(PLATFORM_NAME);
        if (mappings.isEmpty()) {
            log.info("번개장터 카테고리 매핑이 비어있어 시세 수집을 건너뜁니다.");
            return;
        }
        mappings.forEach(this::collectCategory);
    }

    private void collectCategory(CategoryPlatform mapping) {
        Long categoryId = mapping.getCategory().getId();
        String bunjangCategoryId = mapping.getExternalCategoryId();
        List<Long> prices = collectFreshPrices(bunjangCategoryId);
        if (prices.isEmpty()) {
            log.info("카테고리 {}(번개장터 {}) 신규 매물 없음", categoryId, bunjangCategoryId);
            return;
        }

        long minPrice = prices.stream().mapToLong(Long::longValue).min().orElseThrow();
        long maxPrice = prices.stream().mapToLong(Long::longValue).max().orElseThrow();
        OptionalDouble average = prices.stream().mapToLong(Long::longValue).average();
        long averagePrice = Math.round(average.orElseThrow());

        cachePriceStats(categoryId, minPrice, averagePrice, maxPrice);
        saveAnalysisSnapshots(categoryId, minPrice, averagePrice, maxPrice);

        log.info(
                "카테고리 {}(번개장터 {}) 시세 수집 완료 — 신규 {}건, 평균 {}원, 최저 {}원, 최고 {}원",
                categoryId,
                bunjangCategoryId,
                prices.size(),
                averagePrice,
                minPrice,
                maxPrice);
    }

    private List<Long> collectFreshPrices(String bunjangCategoryId) {
        List<Long> prices = new ArrayList<>();
        String cursor = null;
        for (int page = 0; page < properties.pageLimit(); page++) {
            BunjangCategoryPage result = bunjangCategoryClient.fetchPage(bunjangCategoryId, cursor);
            for (BunjangProductItem item : result.items()) {
                if (item.ad()) {
                    continue; // 광고 매물은 검색 연관도/입찰가로 노출돼 시세를 왜곡할 수 있어 제외
                }
                if (isFresh(item.pid())) {
                    prices.add(item.price());
                }
            }
            if (!result.hasNext()) {
                break;
            }
            cursor = result.nextCursor();
        }
        return prices;
    }

    /** 이미 수집한 게시글이면 {@code false}. Redis TTL이 지나면 같은 게시글도 다시 신규로 취급한다. */
    private boolean isFresh(long pid) {
        Boolean isNew = redisTemplate.opsForValue().setIfAbsent(SEEN_KEY_PREFIX + pid, "1", properties.dedupeTtl());
        return Boolean.TRUE.equals(isNew);
    }

    private void cachePriceStats(Long categoryId, long minPrice, long averagePrice, long maxPrice) {
        String value = "min=%d,avg=%d,max=%d".formatted(minPrice, averagePrice, maxPrice);
        redisTemplate.opsForValue().set(PRICE_CACHE_KEY_PREFIX + categoryId, value, properties.cacheTtl());
    }

    private void saveAnalysisSnapshots(Long categoryId, long minPrice, long averagePrice, long maxPrice) {
        List<Product> products = productRepository.findByCategoryId(categoryId);
        LocalDateTime analyzedAt = LocalDateTime.now();
        List<ProductAnalysis> snapshots = products.stream()
                .map(product ->
                        ProductAnalysis.fromCategoryPriceStats(product, minPrice, averagePrice, maxPrice, analyzedAt))
                .toList();
        productAnalysisRepository.saveAll(snapshots);
    }
}
