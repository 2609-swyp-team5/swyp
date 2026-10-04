package com.swyp.team5.crawl.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;

import com.swyp.team5.crawl.client.BunjangSearchClient;
import com.swyp.team5.crawl.dto.BunjangSearchItem;
import com.swyp.team5.platform.entity.CategoryPlatform;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.CategoryPlatformRepository;

/**
 * 상품명으로 번개장터를 검색해 판매중 매물을 {@link PlatformListing}으로 저장한다. 카테고리 수집만으로는 같은 물건 비교 매물이
 * 부족할 때 시세 분석이 호출한다. 저장해 두면 다음 분석·가격 추이·경쟁 상품 조회에서도 비교 매물로 쓰인다. 이미 있는 매물의
 * 카테고리는 카테고리 수집이 정한 값을 유지한다({@link PlatformListingUpserter#upsertKeepingCategory}).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ListingSearchService {

    private static final String PLATFORM_NAME = "번개장터"; // 현재는 번개장터만 검색하므로 상수로 고정

    /** 괄호로 감싼 판매 문구("[국내당일]", "(배송비포함)" 등) — 검색어를 흐리므로 뺀다. */
    private static final Pattern BRACKETED = Pattern.compile("\\[[^]]*]|\\([^)]*\\)|\\{[^}]*}|<[^>]*>");

    private static final Pattern NOT_WORD = Pattern.compile("[^0-9A-Za-z가-힣]+");

    private static final int MAX_QUERY_LENGTH = 50;

    /** 판매중 결과가 이보다 적으면 앞 단어로 줄인 검색어로 다시 검색한다(검색어가 길면 결과가 급감하므로). */
    static final int ENOUGH_RESULTS = 10;

    /** 재검색할 때 남길 앞 단어 수(긴 순서대로 시도). */
    private static final List<Integer> SHORTER_WORD_COUNTS = List.of(3, 2);

    private final BunjangSearchClient bunjangSearchClient;
    private final CategoryPlatformRepository categoryPlatformRepository;
    private final PlatformListingUpserter platformListingUpserter;

    /**
     * 상품명(+브랜드)으로 검색해 판매중·비광고 매물 중 우리 카테고리에 매핑되는 것만 저장하고 돌려준다. 판매중 결과가
     * {@link #ENOUGH_RESULTS}건보다 적고 검색어가 길면 앞 단어 3개, 2개로 줄여 다시 검색해 합친다(최대 3회 요청). 검색이 실패하면
     * 분석을 막지 않도록 그때까지 찾은 것만 쓴다(로그만 남김).
     *
     * @param brand 브랜드(없으면 null — 상품명에 이미 있으면 붙이지 않음)
     * @param size 검색해 올 건수
     */
    public List<PlatformListing> searchAndSave(String title, String brand, int size) {
        String query = searchQuery(title, brand);
        if (query.isEmpty()) {
            return List.of();
        }
        try {
            List<BunjangSearchItem> items = searchSelling(query, size);
            if (items.isEmpty()) {
                return List.of();
            }
            Map<String, CategoryPlatform> mappings = categoryPlatformRepository
                    .findByPlatformNameAndExternalCategoryIds(
                            PLATFORM_NAME,
                            items.stream()
                                    .map(BunjangSearchItem::bunjangCategoryId)
                                    .collect(Collectors.toSet()))
                    .stream()
                    .collect(Collectors.toMap(
                            CategoryPlatform::getExternalCategoryId, Function.identity(), (first, second) -> first));
            List<PlatformListing> saved = items.stream()
                    .filter(item -> mappings.containsKey(item.bunjangCategoryId()))
                    .map(item -> {
                        CategoryPlatform mapping = mappings.get(item.bunjangCategoryId());
                        return platformListingUpserter.upsertKeepingCategory(
                                mapping.getPlatform(),
                                mapping.getCategory(),
                                item.pid(),
                                item.name(),
                                item.price(),
                                item.status(),
                                item.productImage());
                    })
                    .toList();
            log.info("번개장터 검색 \"{}\": 판매중 {}건 중 {}건 저장", query, items.size(), saved.size());
            return saved;
        } catch (Exception e) {
            log.warn("번개장터 검색 \"{}\" 결과 저장 중 오류가 발생해 검색 결과 없이 진행합니다. 원인: {}", query, e.toString());
            return List.of();
        }
    }

    /** 검색어와 앞 단어로 줄인 검색어를 차례로 검색해 판매중·비광고 매물을 모은다(pid 중복 제거, 충분하면 멈춤). */
    private List<BunjangSearchItem> searchSelling(String query, int size) {
        Map<Long, BunjangSearchItem> found = new LinkedHashMap<>();
        for (String attempt : queriesToTry(query)) {
            try {
                bunjangSearchClient.search(attempt, size).stream()
                        .filter(item -> item.isSelling() && !item.ad())
                        .forEach(item -> found.putIfAbsent(item.pid(), item));
            } catch (Exception e) {
                log.warn("번개장터 검색 \"{}\" 중 오류가 발생했습니다. 원인: {}", attempt, e.toString());
                break;
            }
            if (found.size() >= ENOUGH_RESULTS) {
                break;
            }
            log.info("번개장터 검색 \"{}\": 판매중 {}건뿐이라 더 짧은 검색어로 다시 찾습니다.", attempt, found.size());
        }
        return List.copyOf(found.values());
    }

    /** 원래 검색어, 그다음 단어가 더 많을 때만 앞 3단어·앞 2단어 검색어(중복 제외). */
    static List<String> queriesToTry(String query) {
        List<String> words = List.of(query.split(" "));
        List<String> queries = new ArrayList<>(List.of(query));
        for (int count : SHORTER_WORD_COUNTS) {
            if (words.size() > count) {
                queries.add(String.join(" ", words.subList(0, count)));
            }
        }
        return queries;
    }

    /** 괄호 문구·특수문자를 빼고 공백을 정리한 검색어(브랜드가 상품명에 없으면 앞에 붙임, 최대 50자). */
    static String searchQuery(String title, String brand) {
        String cleanedTitle = clean(title);
        String cleanedBrand = clean(brand);
        String query = cleanedBrand.isEmpty()
                        || cleanedTitle.toLowerCase(Locale.ROOT).contains(cleanedBrand.toLowerCase(Locale.ROOT))
                ? cleanedTitle
                : cleanedBrand + " " + cleanedTitle;
        return query.length() <= MAX_QUERY_LENGTH
                ? query
                : query.substring(0, MAX_QUERY_LENGTH).strip();
    }

    private static String clean(String text) {
        if (text == null) {
            return "";
        }
        String withoutBrackets = BRACKETED.matcher(text).replaceAll(" ");
        return NOT_WORD.matcher(withoutBrackets).replaceAll(" ").strip().replaceAll(" +", " ");
    }
}
