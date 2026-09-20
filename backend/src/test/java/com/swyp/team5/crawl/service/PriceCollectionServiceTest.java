package com.swyp.team5.crawl.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 시세 데이터 수집 Service 단위 테스트.
@ExtendWith(MockitoExtension.class)
class PriceCollectionServiceTest {

    private static final BunjangCrawlProperties PROPERTIES = new BunjangCrawlProperties(5);

    @Mock
    private BunjangCategoryClient bunjangCategoryClient;

    @Mock
    private CategoryPlatformRepository categoryPlatformRepository;

    @Mock
    private PlatformListingRepository platformListingRepository;

    private PriceCollectionService service() {
        return new PriceCollectionService(
                bunjangCategoryClient, categoryPlatformRepository, platformListingRepository, PROPERTIES);
    }

    private static CategoryPlatform mapping(Long categoryId, String externalCategoryId) {
        Category category = mock(Category.class);
        when(category.getId()).thenReturn(categoryId);
        Platform platform = mock(Platform.class);
        CategoryPlatform mapping = mock(CategoryPlatform.class);
        when(mapping.getCategory()).thenReturn(category);
        lenient().when(mapping.getPlatform()).thenReturn(platform);
        when(mapping.getExternalCategoryId()).thenReturn(externalCategoryId);
        return mapping;
    }

    @Test
    void collectAllDoesNothingWhenNoCategoryMapping() {
        when(categoryPlatformRepository.findByPlatformName("번개장터")).thenReturn(List.of());

        service().collectAll();

        verifyNoInteractions(bunjangCategoryClient, platformListingRepository);
    }

    @Test
    void collectAllUpsertsNewListingsAndFiltersAdsAndNonSellingItems() {
        CategoryPlatform mapping = mapping(10L, "999");
        when(categoryPlatformRepository.findByPlatformName("번개장터")).thenReturn(List.of(mapping));
        when(bunjangCategoryClient.fetchPage(eq("999"), any()))
                .thenReturn(new BunjangCategoryPage(
                        List.of(
                                new BunjangProductItem(1L, "상품1", 1000L, "SELLING", false, "https://img/1"),
                                new BunjangProductItem(2L, "상품2", 3000L, "SELLING", false, "https://img/2"),
                                new BunjangProductItem(3L, "광고상품", 999_999L, "SELLING", true, "https://img/3"),
                                new BunjangProductItem(4L, "판매완료상품", 1L, "SOLD_OUT", false, "https://img/4")),
                        null,
                        false));
        when(platformListingRepository.findByPlatformAndExternalItemId(any(), anyString()))
                .thenReturn(Optional.empty());

        service().collectAll();

        verify(bunjangCategoryClient, times(1)).fetchPage(eq("999"), any());
        verify(platformListingRepository).findByPlatformAndExternalItemId(mapping.getPlatform(), "1");
        verify(platformListingRepository).findByPlatformAndExternalItemId(mapping.getPlatform(), "2");
        verify(platformListingRepository, never()).findByPlatformAndExternalItemId(mapping.getPlatform(), "3");
        verify(platformListingRepository, never()).findByPlatformAndExternalItemId(mapping.getPlatform(), "4");

        ArgumentCaptor<PlatformListing> captor = ArgumentCaptor.forClass(PlatformListing.class);
        verify(platformListingRepository, times(2)).save(captor.capture());
        List<Long> savedPrices =
                captor.getAllValues().stream().map(PlatformListing::getPrice).toList();
        assertThat(savedPrices).containsExactlyInAnyOrder(1000L, 3000L);
    }

    @Test
    void collectAllUpdatesExistingListingInPlace() {
        CategoryPlatform mapping = mapping(10L, "999");
        when(categoryPlatformRepository.findByPlatformName("번개장터")).thenReturn(List.of(mapping));
        when(bunjangCategoryClient.fetchPage(eq("999"), any()))
                .thenReturn(new BunjangCategoryPage(
                        List.of(new BunjangProductItem(1L, "상품1(가격변동)", 5000L, "SELLING", false, "https://img/1")),
                        null,
                        false));
        PlatformListing existing = PlatformListing.create(
                mapping.getPlatform(),
                mapping.getCategory(),
                "1",
                "상품1",
                1000L,
                "SELLING",
                "https://img/1",
                "https://m.bunjang.co.kr/products/1");
        when(platformListingRepository.findByPlatformAndExternalItemId(mapping.getPlatform(), "1"))
                .thenReturn(Optional.of(existing));

        service().collectAll();

        verify(platformListingRepository).save(existing);
        assertThat(existing.getPrice()).isEqualTo(5000L);
        assertThat(existing.getTitle()).isEqualTo("상품1(가격변동)");
    }

    @Test
    void collectAllContinuesOtherCategoriesWhenOneFails() {
        CategoryPlatform failingMapping = mapping(10L, "fail");
        CategoryPlatform okMapping = mapping(20L, "999");
        when(categoryPlatformRepository.findByPlatformName("번개장터")).thenReturn(List.of(failingMapping, okMapping));
        when(bunjangCategoryClient.fetchPage(eq("fail"), any())).thenThrow(new RuntimeException("파싱 실패"));
        when(bunjangCategoryClient.fetchPage(eq("999"), any()))
                .thenReturn(new BunjangCategoryPage(
                        List.of(new BunjangProductItem(1L, "상품1", 1000L, "SELLING", false, "https://img/1")),
                        null,
                        false));
        when(platformListingRepository.findByPlatformAndExternalItemId(any(), anyString()))
                .thenReturn(Optional.empty());

        service().collectAll();

        verify(bunjangCategoryClient).fetchPage(eq("fail"), any());
        verify(bunjangCategoryClient).fetchPage(eq("999"), any());
    }

    @Test
    void collectAllSavesNothingWhenNoItemsReturned() {
        CategoryPlatform mapping = mapping(10L, "999");
        when(categoryPlatformRepository.findByPlatformName("번개장터")).thenReturn(List.of(mapping));
        when(bunjangCategoryClient.fetchPage(eq("999"), any()))
                .thenReturn(new BunjangCategoryPage(List.of(), null, false));

        service().collectAll();

        verifyNoInteractions(platformListingRepository);
    }

    // page-limit 캡에 걸려도(hasNext=true인데도) 그 이상은 조회하지 않고 멈춤(캡 도달 여부 로그 구분의 전제 동작)
    @Test
    void collectAllStopsAtPageLimitEvenWhenMorePagesExist() {
        BunjangCrawlProperties singlePageLimit = new BunjangCrawlProperties(1);
        PriceCollectionService service = new PriceCollectionService(
                bunjangCategoryClient, categoryPlatformRepository, platformListingRepository, singlePageLimit);
        CategoryPlatform mapping = mapping(10L, "999");
        when(categoryPlatformRepository.findByPlatformName("번개장터")).thenReturn(List.of(mapping));
        when(bunjangCategoryClient.fetchPage(eq("999"), any()))
                .thenReturn(new BunjangCategoryPage(
                        List.of(new BunjangProductItem(1L, "상품1", 1000L, "SELLING", false, "https://img/1")),
                        "next-cursor",
                        true));
        when(platformListingRepository.findByPlatformAndExternalItemId(any(), anyString()))
                .thenReturn(Optional.empty());

        service.collectAll();

        verify(bunjangCategoryClient, times(1)).fetchPage(eq("999"), any());
        verify(platformListingRepository).save(any());
    }
}
