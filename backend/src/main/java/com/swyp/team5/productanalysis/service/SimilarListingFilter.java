package com.swyp.team5.productanalysis.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.swyp.team5.platform.entity.PlatformListing;

/**
 * 시세 분석에 쓸 "유사 매물"을 고르는 규칙 모음.
 *
 * <p>같은 카테고리라도 전혀 다른 물건이 섞여 있어(예: 디지털 카테고리의 아이폰과 폰케이스·외장하드) 통계를
 * 카테고리 전체로 내면 시세가 왜곡된다. 그래서 2단계로 거른다.
 *
 * <ol>
 *   <li><b>후보 선별(코드, {@link #selectCandidates})</b>: 상품명 키워드가 하나라도 겹치는 매물만 남기고,
 *       구매·대여 글과 (상품명에 없는) 액세서리 매물은 제외한 뒤 키워드 일치도 순으로 상위 N건을 고른다.
 *       넓게 거르는 단계라 오탐이 남는다.
 *   <li><b>최종 선별(AI)</b>: 후보 목록을 AI에게 주고 "같은 물건"인 매물 번호만 돌려받는다(모델·세대 판단).
 * </ol>
 *
 * <p>마지막으로 {@link #removeOutliers}로 가격 이상치(IQR 1.5배 밖)를 빼고 통계를 낸다.
 */
final class SimilarListingFilter {

    /** 한글/영문/숫자 덩어리 단위로 자른다("아이폰15프로" → 아이폰, 15, 프로). */
    private static final Pattern TOKEN = Pattern.compile("[가-힣]+|[a-z]+|\\d+");

    /** 판매 글이 아닌 매물(구매 요청/대여/교환 등). */
    private static final Pattern NOT_FOR_SALE = Pattern.compile("구해요|구합니다|구매합니다|삽니다|매입|대여|렌탈|렌트|교환|부품용");

    /** 본품이 아닌 액세서리 — 상품명에 같은 단어가 없으면 제외한다. */
    private static final List<String> ACCESSORY_WORDS =
            List.of("케이스", "커버", "필름", "파우치", "충전기", "케이블", "거치대", "스트랩", "키링", "스티커", "부품", "박스만");

    /** 물건을 구분하는 데 도움이 안 되는 판매 상투어/수식어(상품명 키워드에서 뺀다). */
    private static final Set<String> STOP_WORDS = Set.of(
            "판매", "팝니다", "판매합니다", "팔아요", "급처", "급매", "새상품", "새제품", "미개봉", "미사용", "중고", "정품", "택포", "무료배송", "배송비", "포함",
            "풀박스", "풀박", "상태", "최상", "좋음", "깨끗", "네고", "가능", "단품", "제품", "상품", "컬러", "색상", "사이즈", "인치", "gb", "tb",
            "세트");

    private SimilarListingFilter() {}

    /**
     * 상품명(+브랜드) 키워드가 겹치는 매물 중 판매 글이 아니거나 액세서리인 것을 빼고, 키워드 일치도가 높은
     * 순으로 최대 {@code limit}건을 고른다. 숫자 키워드(모델 번호 등)만 겹치는 매물은 후보로 보지 않는다.
     *
     * @param title 분석 대상 상품명(우리 상품 제목 또는 외부 매물 제목)
     * @param brand 브랜드(없으면 null — 외부 매물은 항상 null)
     */
    static List<PlatformListing> selectCandidates(
            String title, String brand, List<PlatformListing> listings, int limit) {
        String productText = title + (brand == null ? "" : " " + brand);
        List<String> keywords = keywords(productText);
        String normalizedProductText = normalize(productText);
        if (keywords.isEmpty()) {
            return List.of();
        }

        record Scored(PlatformListing listing, int score) {}
        List<Scored> scored = new ArrayList<>();
        for (PlatformListing listing : listings) {
            String listingTitle = listing.getTitle().toLowerCase(Locale.ROOT);
            if (NOT_FOR_SALE.matcher(listingTitle).find()
                    || isAccessoryOnly(normalize(listingTitle), normalizedProductText)) {
                continue;
            }
            List<String> listingTokens = tokens(listingTitle);
            List<String> matched = keywords.stream()
                    .filter(keyword -> matches(keyword, listingTokens))
                    .toList();
            if (matched.stream().allMatch(SimilarListingFilter::isNumber)) {
                continue;
            }
            scored.add(new Scored(
                    listing, matched.stream().mapToInt(String::length).sum()));
        }
        return scored.stream()
                .sorted(Comparator.comparingInt(Scored::score).reversed())
                .limit(limit)
                .map(Scored::listing)
                .toList();
    }

    /**
     * IQR(사분위 범위) 방식으로 가격 이상치를 뺀다. Q1 - 1.5×IQR ~ Q3 + 1.5×IQR 밖의 가격을 제외하며, 4건
     * 미만이면 사분위가 의미 없으므로 그대로 반환한다.
     *
     * @return 오름차순 정렬된 가격 목록
     */
    static List<Long> removeOutliers(List<Long> prices) {
        List<Long> sorted = prices.stream().sorted().toList();
        if (sorted.size() < 4) {
            return sorted;
        }
        long q1 = quartile(sorted, 0.25);
        long q3 = quartile(sorted, 0.75);
        double fence = (q3 - q1) * 1.5;
        return sorted.stream()
                .filter(price -> price >= q1 - fence && price <= q3 + fence)
                .toList();
    }

    /** {@link #removeOutliers}와 같은 기준으로 가격 이상치 매물을 뺀다(순서 유지). */
    static List<PlatformListing> removeOutlierListings(List<PlatformListing> listings) {
        List<Long> kept =
                removeOutliers(listings.stream().map(PlatformListing::getPrice).toList());
        if (kept.isEmpty()) {
            return List.of();
        }
        long min = kept.getFirst();
        long max = kept.getLast();
        return listings.stream()
                .filter(listing -> listing.getPrice() >= min && listing.getPrice() <= max)
                .toList();
    }

    private static long quartile(List<Long> sorted, double fraction) {
        return sorted.get((int) Math.round(fraction * (sorted.size() - 1)));
    }

    private static List<String> keywords(String text) {
        Set<String> keywords = new LinkedHashSet<>();
        for (String token : tokens(text.toLowerCase(Locale.ROOT))) {
            if ((token.length() >= 2 || isNumber(token)) && !STOP_WORDS.contains(token)) {
                keywords.add(token);
            }
        }
        return List.copyOf(keywords);
    }

    private static List<String> tokens(String lowerCaseText) {
        List<String> tokens = new ArrayList<>();
        Matcher matcher = TOKEN.matcher(lowerCaseText);
        while (matcher.find()) {
            tokens.add(matcher.group());
        }
        return tokens;
    }

    /**
     * 숫자는 정확히 같은 토큰만(15와 150 구분), 3자 이상 단어는 포함 관계("인테리어"⊂"천인테리어그림"),
     * 2자 단어는 토큰의 앞/뒤 일치만 인정한다("프로"가 "랄프로렌" 가운데에 걸리는 오탐 방지).
     */
    private static boolean matches(String keyword, List<String> listingTokens) {
        if (isNumber(keyword)) {
            return listingTokens.contains(keyword);
        }
        if (keyword.length() >= 3) {
            return listingTokens.stream().anyMatch(token -> token.contains(keyword));
        }
        return listingTokens.stream().anyMatch(token -> token.startsWith(keyword) || token.endsWith(keyword));
    }

    private static boolean isAccessoryOnly(String normalizedListingTitle, String normalizedProductText) {
        return ACCESSORY_WORDS.stream()
                .anyMatch(word -> normalizedListingTitle.contains(word) && !normalizedProductText.contains(word));
    }

    private static String normalize(String text) {
        return text.toLowerCase(Locale.ROOT).replaceAll("[^가-힣a-z0-9]", "");
    }

    private static boolean isNumber(String token) {
        return Character.isDigit(token.charAt(0));
    }
}
