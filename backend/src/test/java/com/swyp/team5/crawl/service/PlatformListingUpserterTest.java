package com.swyp.team5.crawl.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.springframework.test.util.ReflectionTestUtils;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.PlatformListingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 번개장터 매물 upsert 단위 테스트.
@ExtendWith(MockitoExtension.class)
class PlatformListingUpserterTest {

    @Mock
    private PlatformListingRepository platformListingRepository;

    private final Platform platform = mock(Platform.class);
    private final Category collected = mock(Category.class);
    private final Category searched = mock(Category.class);

    private PlatformListing existing() {
        PlatformListing listing = PlatformListing.create(
                platform,
                collected,
                "1",
                "다이슨 에어랩",
                300_000L,
                "SELLING",
                "https://img/1",
                "https://m.bunjang.co.kr/products/1");
        ReflectionTestUtils.setField(listing, "id", 10L);
        when(platformListingRepository.findByPlatformAndExternalItemId(platform, "1"))
                .thenReturn(Optional.of(listing));
        when(platformListingRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        return listing;
    }

    // 카테고리 수집 - 이미 있는 매물도 관측값과 카테고리를 갱신
    @Test
    void upsertOverwritesCategoryOfExistingListing() {
        existing();

        PlatformListing saved = new PlatformListingUpserter(platformListingRepository)
                .upsert(platform, searched, 1L, "다이슨 에어랩 컴플리트", 290_000L, "SELLING", "https://img/2");

        assertThat(saved.getCategory()).isSameAs(searched);
        assertThat(saved.getPrice()).isEqualTo(290_000L);
    }

    // 키워드 검색 - 이미 있는 매물은 관측값만 갱신하고 카테고리는 수집이 정한 값을 유지
    @Test
    void upsertKeepingCategoryKeepsCategoryOfExistingListing() {
        existing();

        PlatformListing saved = new PlatformListingUpserter(platformListingRepository)
                .upsertKeepingCategory(platform, searched, 1L, "다이슨 에어랩 컴플리트", 290_000L, "SELLING", "https://img/2");

        assertThat(saved.getCategory()).isSameAs(collected);
        assertThat(saved.getPrice()).isEqualTo(290_000L);
        assertThat(saved.getTitle()).isEqualTo("다이슨 에어랩 컴플리트");
    }

    // 키워드 검색 - 새 매물은 검색 결과 카테고리로 저장
    @Test
    void upsertKeepingCategoryUsesGivenCategoryForNewListing() {
        when(platformListingRepository.findByPlatformAndExternalItemId(platform, "2"))
                .thenReturn(Optional.empty());
        when(platformListingRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        PlatformListing saved = new PlatformListingUpserter(platformListingRepository)
                .upsertKeepingCategory(platform, searched, 2L, "다이슨 에어랩", 300_000L, "SELLING", "https://img/2");

        assertThat(saved.getCategory()).isSameAs(searched);
        assertThat(saved.getExternalItemId()).isEqualTo("2");
    }
}
