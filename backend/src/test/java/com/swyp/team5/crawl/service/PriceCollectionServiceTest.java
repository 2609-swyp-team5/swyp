package com.swyp.team5.crawl.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.crawl.client.BunjangCategoryClient;
import com.swyp.team5.crawl.config.BunjangCrawlProperties;
import com.swyp.team5.crawl.dto.BunjangCategoryPage;
import com.swyp.team5.crawl.dto.BunjangProductItem;
import com.swyp.team5.platform.entity.CategoryPlatform;
import com.swyp.team5.platform.repository.CategoryPlatformRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 시세 데이터 수집(카테고리별 매물 조회·필터링) Service 단위 테스트.
@ExtendWith(MockitoExtension.class)
class PriceCollectionServiceTest {

    private static final Duration DEDUPE_TTL = Duration.ofHours(24);
    private static final Duration CACHE_TTL = Duration.ofHours(1);
    private static final BunjangCrawlProperties PROPERTIES = new BunjangCrawlProperties(5, DEDUPE_TTL, CACHE_TTL);

    @Mock
    private BunjangCategoryClient bunjangCategoryClient;

    @Mock
    private CategoryPlatformRepository categoryPlatformRepository;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private PriceCollectionService service() {
        return new PriceCollectionService(bunjangCategoryClient, categoryPlatformRepository, redisTemplate, PROPERTIES);
    }

    private static CategoryPlatform mapping(Long categoryId, String externalCategoryId) {
        Category category = mock(Category.class);
        when(category.getId()).thenReturn(categoryId);
        CategoryPlatform mapping = mock(CategoryPlatform.class);
        when(mapping.getCategory()).thenReturn(category);
        when(mapping.getExternalCategoryId()).thenReturn(externalCategoryId);
        return mapping;
    }

    @Test
    void collectAllDoesNothingWhenNoCategoryMapping() {
        when(categoryPlatformRepository.findByPlatformName("번개장터")).thenReturn(List.of());

        service().collectAll();

        verifyNoInteractions(bunjangCategoryClient, redisTemplate);
    }

    @Test
    void collectAllFiltersAdsDuplicatesAndNonSellingItems() {
        CategoryPlatform mapping = mapping(10L, "999");
        when(categoryPlatformRepository.findByPlatformName("번개장터")).thenReturn(List.of(mapping));
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(bunjangCategoryClient.fetchPage(eq("999"), any()))
                .thenReturn(new BunjangCategoryPage(
                        List.of(
                                new BunjangProductItem(1L, "상품1", 1000L, "SELLING", false),
                                new BunjangProductItem(2L, "상품2", 3000L, "SELLING", false),
                                new BunjangProductItem(3L, "광고상품", 999_999L, "SELLING", true),
                                new BunjangProductItem(4L, "판매완료상품", 1L, "SOLD_OUT", false)),
                        null,
                        false));
        when(valueOperations.setIfAbsent(anyString(), eq("1"), eq(DEDUPE_TTL))).thenReturn(true);

        service().collectAll();

        verify(bunjangCategoryClient, times(1)).fetchPage(eq("999"), any());
        verify(valueOperations).setIfAbsent(eq("crawl:bunjang:seen:1"), eq("1"), eq(DEDUPE_TTL));
        verify(valueOperations).setIfAbsent(eq("crawl:bunjang:seen:2"), eq("1"), eq(DEDUPE_TTL));
        verify(valueOperations, never()).setIfAbsent(eq("crawl:bunjang:seen:3"), anyString(), any(Duration.class));
        verify(valueOperations, never()).setIfAbsent(eq("crawl:bunjang:seen:4"), anyString(), any(Duration.class));
    }

    @Test
    void collectAllContinuesOtherCategoriesWhenOneFails() {
        CategoryPlatform failingMapping = mapping(10L, "fail");
        CategoryPlatform okMapping = mapping(20L, "999");
        when(categoryPlatformRepository.findByPlatformName("번개장터")).thenReturn(List.of(failingMapping, okMapping));
        when(bunjangCategoryClient.fetchPage(eq("fail"), any())).thenThrow(new RuntimeException("파싱 실패"));
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(bunjangCategoryClient.fetchPage(eq("999"), any()))
                .thenReturn(new BunjangCategoryPage(
                        List.of(new BunjangProductItem(1L, "상품1", 1000L, "SELLING", false)), null, false));
        when(valueOperations.setIfAbsent(anyString(), eq("1"), eq(DEDUPE_TTL))).thenReturn(true);

        service().collectAll();

        verify(bunjangCategoryClient).fetchPage(eq("fail"), any());
        verify(bunjangCategoryClient).fetchPage(eq("999"), any());
    }

    @Test
    void collectAllSkipsWhenNoFreshItems() {
        CategoryPlatform mapping = mapping(10L, "999");
        when(categoryPlatformRepository.findByPlatformName("번개장터")).thenReturn(List.of(mapping));
        when(bunjangCategoryClient.fetchPage(eq("999"), any()))
                .thenReturn(new BunjangCategoryPage(List.of(), null, false));

        service().collectAll();

        verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
    }
}
