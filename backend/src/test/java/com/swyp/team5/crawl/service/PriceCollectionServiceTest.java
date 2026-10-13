package com.swyp.team5.crawl.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.crawl.client.BunjangCategoryClient;
import com.swyp.team5.crawl.config.BunjangCrawlProperties;
import com.swyp.team5.crawl.dto.BunjangCategoryPage;
import com.swyp.team5.crawl.dto.BunjangProductItem;
import com.swyp.team5.platform.entity.CategoryPlatform;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.repository.CategoryPlatformRepository;
import com.swyp.team5.product.entity.ProductStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 시세 데이터 수집 Service 단위 테스트 — 수집은 메모리에 모으고, 끝난 뒤 한 번에 저장(PlatformListingBatchWriter)한다.
@ExtendWith(MockitoExtension.class)
class PriceCollectionServiceTest {

    private static final BunjangCrawlProperties PROPERTIES = new BunjangCrawlProperties(5);

    @Mock
    private BunjangCategoryClient bunjangCategoryClient;

    @Mock
    private CategoryPlatformRepository categoryPlatformRepository;

    @Mock
    private PlatformListingBatchWriter platformListingBatchWriter;

    private final Platform platform = mock(Platform.class);

    private PriceCollectionService service() {
        return service(PROPERTIES);
    }

    private PriceCollectionService service(BunjangCrawlProperties properties) {
        return new PriceCollectionService(
                bunjangCategoryClient, categoryPlatformRepository, platformListingBatchWriter, properties);
    }

    private CategoryPlatform mapping(Long categoryId, String externalCategoryId) {
        Category category = mock(Category.class);
        lenient().when(category.getId()).thenReturn(categoryId);
        CategoryPlatform mapping = mock(CategoryPlatform.class);
        lenient().when(mapping.getCategory()).thenReturn(category);
        lenient().when(mapping.getPlatform()).thenReturn(platform);
        when(mapping.getExternalCategoryId()).thenReturn(externalCategoryId);
        return mapping;
    }

    @SuppressWarnings("unchecked")
    private List<ListingObservation> writtenObservations() {
        ArgumentCaptor<List<ListingObservation>> captor = ArgumentCaptor.forClass(List.class);
        verify(platformListingBatchWriter).write(eq(platform), captor.capture());
        return captor.getValue();
    }

    @Test
    void collectAllDoesNothingWhenNoCategoryMapping() {
        when(categoryPlatformRepository.findCollectTargets("번개장터", ProductStatus.ANALYSIS_TARGETS))
                .thenReturn(List.of());

        service().collectAll();

        verifyNoInteractions(bunjangCategoryClient, platformListingBatchWriter);
    }

    // 광고·판매중 아닌 매물은 빼고, 모은 매물을 한 번에 저장
    @Test
    void collectAllWritesSellingListingsOnceAndFiltersAds() {
        CategoryPlatform mapping = mapping(10L, "999");
        when(categoryPlatformRepository.findCollectTargets("번개장터", ProductStatus.ANALYSIS_TARGETS))
                .thenReturn(List.of(mapping));
        when(bunjangCategoryClient.fetchPage(eq("999"), any()))
                .thenReturn(new BunjangCategoryPage(
                        List.of(
                                new BunjangProductItem(1L, "상품1", 1000L, "SELLING", false, "https://img/1"),
                                new BunjangProductItem(2L, "상품2", 3000L, "SELLING", false, "https://img/2"),
                                new BunjangProductItem(3L, "광고상품", 999_999L, "SELLING", true, "https://img/3"),
                                new BunjangProductItem(4L, "판매완료상품", 1L, "SOLD_OUT", false, "https://img/4")),
                        null,
                        false));
        when(platformListingBatchWriter.write(eq(platform), anyList()))
                .thenReturn(new PlatformListingBatchWriter.Result(2, 0));

        service().collectAll();

        List<ListingObservation> observations = writtenObservations();
        assertThat(observations)
                .extracting(
                        ListingObservation::externalItemId, ListingObservation::price, ListingObservation::listingUrl)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("1", 1000L, "https://m.bunjang.co.kr/products/1"),
                        org.assertj.core.groups.Tuple.tuple("2", 3000L, "https://m.bunjang.co.kr/products/2"));
        assertThat(observations.get(0).category()).isSameAs(mapping.getCategory());
    }

    // 한 카테고리가 실패해도 다른 카테고리는 수집해 함께 저장
    @Test
    void collectAllContinuesOtherCategoriesWhenOneFails() {
        CategoryPlatform failingMapping = mapping(10L, "fail");
        CategoryPlatform okMapping = mapping(20L, "999");
        when(categoryPlatformRepository.findCollectTargets("번개장터", ProductStatus.ANALYSIS_TARGETS))
                .thenReturn(List.of(failingMapping, okMapping));
        when(bunjangCategoryClient.fetchPage(eq("fail"), any())).thenThrow(new RuntimeException("파싱 실패"));
        when(bunjangCategoryClient.fetchPage(eq("999"), any()))
                .thenReturn(new BunjangCategoryPage(
                        List.of(new BunjangProductItem(1L, "상품1", 1000L, "SELLING", false, "https://img/1")),
                        null,
                        false));
        when(platformListingBatchWriter.write(eq(platform), anyList()))
                .thenReturn(new PlatformListingBatchWriter.Result(1, 0));

        service().collectAll();

        verify(bunjangCategoryClient).fetchPage(eq("fail"), any());
        assertThat(writtenObservations())
                .extracting(ListingObservation::externalItemId)
                .containsExactly("1");
    }

    @Test
    void collectAllSavesNothingWhenNoItemsReturned() {
        CategoryPlatform mapping = mapping(10L, "999");
        when(categoryPlatformRepository.findCollectTargets("번개장터", ProductStatus.ANALYSIS_TARGETS))
                .thenReturn(List.of(mapping));
        when(bunjangCategoryClient.fetchPage(eq("999"), any()))
                .thenReturn(new BunjangCategoryPage(List.of(), null, false));

        service().collectAll();

        verify(platformListingBatchWriter, never()).write(any(), anyList());
    }

    // page-limit 캡에 걸려도(hasNext=true인데도) 그 이상은 조회하지 않고 멈춤(캡 도달 여부 로그 구분의 전제 동작)
    @Test
    void collectAllStopsAtPageLimitEvenWhenMorePagesExist() {
        CategoryPlatform mapping = mapping(10L, "999");
        when(categoryPlatformRepository.findCollectTargets("번개장터", ProductStatus.ANALYSIS_TARGETS))
                .thenReturn(List.of(mapping));
        when(bunjangCategoryClient.fetchPage(eq("999"), any()))
                .thenReturn(new BunjangCategoryPage(
                        List.of(new BunjangProductItem(1L, "상품1", 1000L, "SELLING", false, "https://img/1")),
                        "next-cursor",
                        true));
        when(platformListingBatchWriter.write(eq(platform), anyList()))
                .thenReturn(new PlatformListingBatchWriter.Result(1, 0));

        service(new BunjangCrawlProperties(1)).collectAll();

        verify(bunjangCategoryClient, times(1)).fetchPage(eq("999"), any());
        assertThat(writtenObservations()).hasSize(1);
    }
}
