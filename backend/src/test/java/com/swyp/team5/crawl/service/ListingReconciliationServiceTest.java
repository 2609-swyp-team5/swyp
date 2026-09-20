package com.swyp.team5.crawl.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.crawl.client.BunjangProductClient;
import com.swyp.team5.crawl.config.ListingReconciliationProperties;
import com.swyp.team5.crawl.dto.BunjangProductDetail;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.PlatformListingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 매물 재확인(reconciliation) Service 단위 테스트.
@ExtendWith(MockitoExtension.class)
class ListingReconciliationServiceTest {

    private static final ListingReconciliationProperties PROPERTIES = new ListingReconciliationProperties(20, 300, 0L);

    @Mock
    private BunjangProductClient bunjangProductClient;

    @Mock
    private PlatformListingRepository platformListingRepository;

    private ListingReconciliationService service() {
        return new ListingReconciliationService(bunjangProductClient, platformListingRepository, PROPERTIES);
    }

    private static PlatformListing listing(String externalItemId) {
        Category category = mock(Category.class);
        PlatformListing listing = mock(PlatformListing.class);
        lenient().when(listing.getExternalItemId()).thenReturn(externalItemId);
        lenient().when(listing.getCategory()).thenReturn(category);
        lenient().when(listing.getTitle()).thenReturn("기존 제목");
        lenient().when(listing.getPrice()).thenReturn(1000L);
        lenient().when(listing.getImageUrl()).thenReturn("https://img/1");
        lenient().when(listing.getListingUrl()).thenReturn("https://m.bunjang.co.kr/products/1");
        return listing;
    }

    // 재확인 대상이 없으면 API를 호출하지 않음
    @Test
    void reconcileDoesNothingWhenNoCandidates() {
        when(platformListingRepository.findByStatusAndLastSeenAtBeforeOrderByLastSeenAtAsc(anyString(), any(), any()))
                .thenReturn(List.of());

        service().reconcile();

        verifyNoInteractions(bunjangProductClient);
    }

    // 여전히 판매중이면 관측값을 갱신(=last_seen_at 되살림)
    @Test
    void reconcileRefreshesListingWhenStillSelling() {
        PlatformListing listing = listing("1");
        when(platformListingRepository.findByStatusAndLastSeenAtBeforeOrderByLastSeenAtAsc(anyString(), any(), any()))
                .thenReturn(List.of(listing));
        when(bunjangProductClient.fetchDetail("1"))
                .thenReturn(new BunjangProductDetail(1L, "SELLING", 5000L, "새 제목", null));

        service().reconcile();

        verify(listing)
                .observe(listing.getCategory(), "새 제목", 5000L, "SELLING", "https://img/1", listing.getListingUrl());
        verify(platformListingRepository).save(listing);
    }

    // 삭제/존재하지 않는 매물이면 errorCode를 상태값으로 기록(다음 재확인 대상에서 자연스럽게 제외됨)
    @Test
    void reconcileRecordsErrorCodeWhenProductDeleted() {
        PlatformListing listing = listing("2");
        when(platformListingRepository.findByStatusAndLastSeenAtBeforeOrderByLastSeenAtAsc(anyString(), any(), any()))
                .thenReturn(List.of(listing));
        when(bunjangProductClient.fetchDetail("2"))
                .thenReturn(new BunjangProductDetail(2L, null, null, null, "ERR_DELETED_PRODUCT"));

        service().reconcile();

        ArgumentCaptor<String> statusCaptor = ArgumentCaptor.forClass(String.class);
        verify(listing).observe(any(), anyString(), any(), statusCaptor.capture(), anyString(), anyString());
        assertThat(statusCaptor.getValue()).isEqualTo("ERR_DELETED_PRODUCT");
        verify(platformListingRepository).save(listing);
    }

    // 한 매물 확인이 실패해도 나머지 매물은 계속 재확인
    @Test
    void reconcileContinuesOtherListingsWhenOneFails() {
        PlatformListing failing = listing("3");
        PlatformListing ok = listing("4");
        when(platformListingRepository.findByStatusAndLastSeenAtBeforeOrderByLastSeenAtAsc(anyString(), any(), any()))
                .thenReturn(List.of(failing, ok));
        when(bunjangProductClient.fetchDetail("3")).thenThrow(new RuntimeException("네트워크 오류"));
        when(bunjangProductClient.fetchDetail("4"))
                .thenReturn(new BunjangProductDetail(4L, "SELLING", 2000L, "제목", null));

        service().reconcile();

        verify(platformListingRepository, never()).save(failing);
        verify(platformListingRepository).save(ok);
    }
}
