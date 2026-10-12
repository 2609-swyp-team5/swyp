package com.swyp.team5.crawl.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.crawl.client.BunjangSearchClient;
import com.swyp.team5.crawl.dto.BunjangProductItem;
import com.swyp.team5.platform.entity.CategoryPlatform;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.CategoryPlatformRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 상품명 검색으로 비교 매물 저장 Service 단위 테스트.
@ExtendWith(MockitoExtension.class)
class ListingSearchServiceTest {

    @Mock
    private BunjangSearchClient bunjangSearchClient;

    @Mock
    private CategoryPlatformRepository categoryPlatformRepository;

    @Mock
    private PlatformListingUpserter platformListingUpserter;

    private ListingSearchService service() {
        return new ListingSearchService(bunjangSearchClient, categoryPlatformRepository, platformListingUpserter);
    }

    private static final long CATEGORY_ID = 7L;

    private static final String BUNJANG_CATEGORY_ID = "610700002";

    private static BunjangProductItem item(long pid, String status, boolean ad) {
        return new BunjangProductItem(pid, "다이슨 에어랩 " + pid, 300_000L, status, ad, "https://img/" + pid);
    }

    /** 우리 카테고리 → 번개장터 카테고리 매핑을 준비하고, 저장에 쓰일 플랫폼·카테고리를 담은 매핑을 돌려준다. */
    private CategoryPlatform givenMapping() {
        CategoryPlatform mapping = mock(CategoryPlatform.class);
        lenient().when(mapping.getExternalCategoryId()).thenReturn(BUNJANG_CATEGORY_ID);
        lenient().when(mapping.getPlatform()).thenReturn(mock(Platform.class));
        lenient().when(mapping.getCategory()).thenReturn(mock(Category.class));
        when(categoryPlatformRepository.findByPlatformNameAndCategoryId("번개장터", CATEGORY_ID))
                .thenReturn(Optional.of(mapping));
        return mapping;
    }

    // 검색어 - 괄호 문구·특수문자를 빼고, 상품명에 없는 브랜드만 앞에 붙이며, 50자로 자름
    @Test
    void searchQueryCleansTitleAndPrependsMissingBrand() {
        assertThat(ListingSearchService.searchQuery("[국내당일]아이폰 13 핑크 128GB (배송비포함)!!", null))
                .isEqualTo("아이폰 13 핑크 128GB");
        assertThat(ListingSearchService.searchQuery("에어랩 컴플리트", "다이슨")).isEqualTo("다이슨 에어랩 컴플리트");
        assertThat(ListingSearchService.searchQuery("다이슨 에어랩", "다이슨")).isEqualTo("다이슨 에어랩");
        assertThat(ListingSearchService.searchQuery("가".repeat(60), null)).hasSize(50);
        assertThat(ListingSearchService.searchQuery("[]()!!", null)).isEmpty();
    }

    // 저장 - 분석 대상 카테고리의 번개장터 카테고리 안을 검색해 판매중·비광고 매물만(pid 없는 광고 항목 제외) 그 카테고리로 저장하고 돌려줌
    @Test
    void searchAndSaveKeepsOnlySellingNonAdListingsInMappedCategory() {
        CategoryPlatform mapping = givenMapping();
        when(bunjangSearchClient.search("다이슨 에어랩", BUNJANG_CATEGORY_ID))
                .thenReturn(
                        List.of(item(1L, "SELLING", false), item(2L, "RESERVED", false), item(3L, "SELLING", true)));
        PlatformListing saved = mock(PlatformListing.class);
        when(platformListingUpserter.upsertKeepingCategory(
                        mapping.getPlatform(),
                        mapping.getCategory(),
                        1L,
                        "다이슨 에어랩 1",
                        300_000L,
                        "SELLING",
                        "https://img/1"))
                .thenReturn(saved);

        assertThat(service().searchAndSave("다이슨 에어랩", null, CATEGORY_ID)).containsExactly(saved);
    }

    // 카테고리 매핑이 없으면 검색하지 않음
    @Test
    void searchAndSaveSkipsWhenCategoryHasNoMapping() {
        when(categoryPlatformRepository.findByPlatformNameAndCategoryId("번개장터", CATEGORY_ID))
                .thenReturn(Optional.empty());

        assertThat(service().searchAndSave("다이슨 에어랩", null, CATEGORY_ID)).isEmpty();
        verifyNoInteractions(bunjangSearchClient, platformListingUpserter);
    }

    // 실패 - 검색 호출이 실패해도 예외 없이 빈 목록(분석을 막지 않음)
    @Test
    void searchAndSaveReturnsEmptyWhenSearchFails() {
        givenMapping();
        when(bunjangSearchClient.search(anyString(), anyString())).thenThrow(new IllegalStateException("timeout"));

        assertThat(service().searchAndSave("다이슨 에어랩", null, CATEGORY_ID)).isEmpty();
        verifyNoInteractions(platformListingUpserter);
    }

    // 검색어가 비면 호출하지 않음
    @Test
    void searchAndSaveSkipsBlankQuery() {
        assertThat(service().searchAndSave("[급처]", null, CATEGORY_ID)).isEmpty();
        verifyNoInteractions(bunjangSearchClient, platformListingUpserter);
    }

    // 재검색 검색어 - 브랜드 붙인 검색어 → 브랜드 뺀 상품명 → 단어가 더 많을 때만 앞 3·2·1단어(중복 제외)
    @Test
    void queriesToTryAddsTitleOnlyAndShorterQueries() {
        assertThat(ListingSearchService.queriesToTry("빈티지 웨스턴 브라운 스터드 레더 벨트", null))
                .containsExactly("빈티지 웨스턴 브라운 스터드 레더 벨트", "빈티지 웨스턴 브라운", "빈티지 웨스턴", "빈티지");
        assertThat(ListingSearchService.queriesToTry("에어랩 컴플리트", "다이슨"))
                .containsExactly("다이슨 에어랩 컴플리트", "에어랩 컴플리트", "에어랩");
        assertThat(ListingSearchService.queriesToTry("에어랩", null)).containsExactly("에어랩");
        assertThat(ListingSearchService.queriesToTry("[급처]", null)).isEmpty();
    }

    // 검색어 정리 - 판매 문구 단어("팝니다"·"급처" 등)와 말투 어미("~이요")를 빼서, 브랜드를 붙여 못 찾으면 핵심어로 찾게 함
    @Test
    void queriesToTryDropsFillerWordsAndEndings() {
        assertThat(ListingSearchService.queriesToTry("주판이요", "몰루")).containsExactly("몰루 주판", "주판");
        assertThat(ListingSearchService.queriesToTry("아이폰 케이스 팝니다", null)).containsExactly("아이폰 케이스", "아이폰");
        assertThat(ListingSearchService.searchQuery("급처 아이패드 팝니다 택포", null)).isEqualTo("아이패드");
        // 어미를 떼면 2글자 미만이 되는 단어는 그대로
        assertThat(ListingSearchService.searchQuery("고이요", null)).isEqualTo("고이요");
    }

    // 1단어 재검색 - 2글자 이하나 "~의"로 끝나는 수식어 한 단어만 남으면 검색하지 않음, "중고"는 군더더기로 뺌
    @Test
    void queriesToTrySkipsMeaninglessSingleWord() {
        assertThat(ListingSearchService.queriesToTry("한국의 단청 전지 시트", null))
                .containsExactly("한국의 단청 전지 시트", "한국의 단청 전지", "한국의 단청");
        assertThat(ListingSearchService.queriesToTry("PS 비타 본체", null)).containsExactly("PS 비타 본체", "PS 비타");
        assertThat(ListingSearchService.queriesToTry("PSVITA 중고 영웅전설 섬의 궤적1", null))
                .containsExactly("PSVITA 영웅전설 섬의 궤적1", "PSVITA 영웅전설 섬의", "PSVITA 영웅전설", "PSVITA");
        assertThat(ListingSearchService.isMeaningfulSingleWord("주판이")).isTrue();
        assertThat(ListingSearchService.isMeaningfulSingleWord("두얼굴의")).isFalse();
    }

    // 검색 결과가 끝까지 없으면 모든 검색어를 시도한 뒤 빈 목록(저장 없음)
    @Test
    void searchAndSaveTriesEveryQueryBeforeGivingUp() {
        givenMapping();
        when(bunjangSearchClient.search(anyString(), eq(BUNJANG_CATEGORY_ID))).thenReturn(List.of());

        assertThat(service().searchAndSave("주판이요", "몰루", CATEGORY_ID)).isEmpty();
        verify(bunjangSearchClient).search("몰루 주판", BUNJANG_CATEGORY_ID);
        verify(bunjangSearchClient).search("주판", BUNJANG_CATEGORY_ID);
        verifyNoInteractions(platformListingUpserter);
    }

    // 재검색 - 판매중 결과가 10건보다 적으면 앞 단어로 줄여 다시 검색해 합치고(pid 중복 제거), 충분해지면 멈춤
    @Test
    void searchAndSaveRetriesWithShorterQueryWhenTooFewResults() {
        givenMapping();
        when(bunjangSearchClient.search("빈티지 웨스턴 브라운 스터드 레더 벨트", BUNJANG_CATEGORY_ID))
                .thenReturn(List.of(item(1L, "SELLING", false), item(2L, "SOLD_OUT", false)));
        List<BunjangProductItem> more = new ArrayList<>();
        more.add(item(1L, "SELLING", false)); // 첫 검색과 중복
        for (long pid = 10; pid < 19; pid++) {
            more.add(item(pid, "SELLING", false));
        }
        when(bunjangSearchClient.search("빈티지 웨스턴 브라운", BUNJANG_CATEGORY_ID)).thenReturn(more);
        when(platformListingUpserter.upsertKeepingCategory(
                        any(), any(), anyLong(), anyString(), anyLong(), anyString(), anyString()))
                .thenAnswer(invocation -> mock(PlatformListing.class));

        assertThat(service().searchAndSave("빈티지 웨스턴 브라운 스터드 레더 벨트", null, CATEGORY_ID))
                .hasSize(10);
        verify(bunjangSearchClient, never()).search("빈티지 웨스턴", BUNJANG_CATEGORY_ID); // 10건이 모여 앞 2단어 검색은 안 함
    }
}
