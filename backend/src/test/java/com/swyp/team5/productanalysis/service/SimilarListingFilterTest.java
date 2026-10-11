package com.swyp.team5.productanalysis.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;

import java.util.List;

import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.product.entity.Product;
import org.junit.jupiter.api.Test;

// 유사 매물 후보 선별/가격 이상치 제거 단위 테스트.
// 벡터db 도입은 보류, 상품명 키워드 기반 후보 선별과 이상치 제거로 충분히 유사 매물 후보를 걸러낼 수 있다고 판단함.
// 적용 후 성능이 충분치 않으면 벡터db를 도입할 수 있음.
class SimilarListingFilterTest {

    private static Product product(String title, String brand) {
        Product product = mock(Product.class);
        lenient().when(product.getTitle()).thenReturn(title);
        lenient().when(product.getBrand()).thenReturn(brand);
        return product;
    }

    private static PlatformListing listing(String title) {
        PlatformListing listing = mock(PlatformListing.class);
        lenient().when(listing.getTitle()).thenReturn(title);
        return listing;
    }

    private static PlatformListing listing(String title, long price) {
        PlatformListing listing = listing(title);
        lenient().when(listing.getPrice()).thenReturn(price);
        return listing;
    }

    private static List<String> titles(List<PlatformListing> listings) {
        return listings.stream().map(PlatformListing::getTitle).toList();
    }

    // 후보 선별 - 상품명 키워드가 겹치는 매물만 남음(띄어쓰기/대소문자 차이는 무시)
    @Test
    void selectCandidatesKeepsListingsSharingKeywords() {
        Product product = product("아이폰15 프로 256GB", null);
        List<PlatformListing> listings = List.of(listing("아이폰 15프로 512 팝니다"), listing("갤럭시 S24 울트라"));

        assertThat(titles(SimilarListingFilter.selectCandidates(product.getTitle(), product.getBrand(), listings, 30)))
                .containsExactly("아이폰 15프로 512 팝니다");
    }

    // 후보 선별 - 구매/대여 글과 상품명에 없는 액세서리는 제외
    @Test
    void selectCandidatesExcludesNotForSaleAndAccessoryListings() {
        Product product = product("아이폰 15 프로", null);
        List<PlatformListing> listings = List.of(
                listing("아이폰 15 프로 구해요"), listing("아이폰 15 프로 대여"), listing("아이폰 15 프로 폰케이스"), listing("아이폰 15 프로 본체"));

        assertThat(titles(SimilarListingFilter.selectCandidates(product.getTitle(), product.getBrand(), listings, 30)))
                .containsExactly("아이폰 15 프로 본체");
    }

    // 후보 선별 - 상품명에 액세서리 단어가 있으면 액세서리 매물도 후보
    @Test
    void selectCandidatesKeepsAccessoryWhenProductIsAccessory() {
        Product product = product("아이폰 15 케이스", null);

        assertThat(SimilarListingFilter.selectCandidates(
                        product.getTitle(), product.getBrand(), List.of(listing("아이폰 15 투명 케이스")), 30))
                .hasSize(1);
    }

    // 후보 선별 - 숫자만 겹치거나 2자 키워드가 단어 가운데에 걸리는 경우는 후보 아님
    @Test
    void selectCandidatesIgnoresNumberOnlyAndMidWordMatches() {
        Product product = product("아이패드 프로 11", null);
        List<PlatformListing> listings = List.of(listing("폴로 랄프로렌 셔츠 11"), listing("나이키 11 사이즈"));

        assertThat(SimilarListingFilter.selectCandidates(product.getTitle(), product.getBrand(), listings, 30))
                .isEmpty();
    }

    // 후보 선별 - 브랜드도 키워드로 쓰고, 키워드 일치도 높은 순으로 최대 limit건
    @Test
    void selectCandidatesRanksByMatchedKeywordsAndLimits() {
        Product product = product("에어팟 프로 2세대", "애플");
        List<PlatformListing> listings =
                List.of(listing("에어팟 1세대"), listing("애플 에어팟 프로 2세대 미개봉"), listing("에어팟 프로 2세대"));

        assertThat(titles(SimilarListingFilter.selectCandidates(product.getTitle(), product.getBrand(), listings, 2)))
                .containsExactly("애플 에어팟 프로 2세대 미개봉", "에어팟 프로 2세대");
    }

    // 이상치 제거 - IQR 1.5배 밖 가격 제외, 오름차순 반환
    @Test
    void removeOutliersDropsPricesOutsideIqrFence() {
        assertThat(SimilarListingFilter.removeOutliers(
                        List.of(800_000L, 1_000L, 750_000L, 9_900_000L, 700_000L, 850_000L)))
                .containsExactly(700_000L, 750_000L, 800_000L, 850_000L);
    }

    // 이상치 제거 - 4건 미만이면 그대로
    @Test
    void removeOutliersKeepsAllWhenFewerThanFour() {
        assertThat(SimilarListingFilter.removeOutliers(List.of(3L, 1L, 1_000_000L)))
                .containsExactly(1L, 3L, 1_000_000L);
    }

    // 중복 매물 - 정규화한 제목(띄어쓰기·기호·대소문자 무시)과 가격이 같으면 첫 매물만 남김, 가격이 다르면 별개
    @Test
    void removeDuplicatesKeepsFirstOfSameTitleAndPrice() {
        PlatformListing first = listing("갤럭시 와이드8 블랙(4164)", 164_000L);
        PlatformListing otherPrice = listing("갤럭시 와이드8 블랙(4164)", 150_000L);
        List<PlatformListing> listings = List.of(
                first,
                listing("갤럭시 와이드8 블랙(4164)", 164_000L),
                listing("갤럭시와이드8 블랙 4164", 164_000L),
                otherPrice,
                listing("GALAXY 와이드8", 164_000L),
                listing("galaxy 와이드8!", 164_000L));

        List<PlatformListing> result = SimilarListingFilter.removeDuplicates(listings);

        assertThat(result).hasSize(3);
        assertThat(result.get(0)).isSameAs(first);
        assertThat(result.get(1)).isSameAs(otherPrice);
        assertThat(titles(result).get(2)).isEqualTo("GALAXY 와이드8");
    }
}
