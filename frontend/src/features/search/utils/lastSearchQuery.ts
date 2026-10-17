/**
 * 마지막 검색 조건(검색 화면 URL 쿼리)을 이 탭에만 기억한다 — 상세에서 [이전 페이지]로 돌아갈 때 필터·정렬을 다시 걸지 않도록.
 * 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 조용히 넘어가고 기본 검색 화면으로 돌아간다.
 */
const STORAGE_KEY = "jigeumini:last-search-query";

export function saveLastSearchQuery(query: string) {
    try {
        sessionStorage.setItem(STORAGE_KEY, query);
    } catch {
        // 저장하지 못하면 기본 검색 화면으로 돌아간다
    }
}

/** 돌아갈 검색 화면 주소 — 기억한 조건이 없으면 `/search`. */
export function lastSearchHref() {
    try {
        const query = sessionStorage.getItem(STORAGE_KEY);
        return query ? `/search?${query}` : "/search";
    } catch {
        return "/search";
    }
}
