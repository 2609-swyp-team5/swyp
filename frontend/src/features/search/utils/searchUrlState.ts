import type {
    SearchCondition,
    SearchDefectStatus,
    SearchParams,
    SearchPlatform,
    SearchSort,
    SearchStatus,
} from "../types";

/** 검색 화면 상태 — URL 쿼리(`/search?keyword=…&sort=…`)가 기준이고, 이름은 `GET /products` 파라미터와 같다. */
export type SearchUrlState = {
    keyword: string;
    sort: SearchSort;
    filters: SearchParams;
};

const defaultSort: SearchSort = "LATEST";
const sorts: SearchSort[] = ["RECOMMENDED", "LATEST", "INTEREST", "PRICE_HIGH", "PRICE_LOW"];
const statuses: SearchStatus[] = ["DRAFT", "ON_SALE", "RESERVED", "SOLD_OUT"];
const platforms: Exclude<SearchPlatform, "ALL">[] = ["BUNJANG", "OUR"];
const conditions: SearchCondition[] = ["S", "A", "B", "C", "D"];
const defectStatuses: SearchDefectStatus[] = ["NORMAL", "ISSUES", "UNKNOWN"];

function pickAll<T extends string>(params: URLSearchParams, name: string, allowed: T[]) {
    const values = params.getAll(name).filter((value): value is T => allowed.includes(value as T));
    return values.length ? [...new Set(values)] : undefined;
}

function readPrice(params: URLSearchParams, name: string) {
    const raw = params.get(name);
    if (raw === null || raw.trim() === "") return undefined;
    const value = Number(raw);
    return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

/** URL 쿼리를 검색 상태로 읽는다 — 손으로 고친 잘못된 값은 무시한다. */
export function parseSearchUrl(params: URLSearchParams): SearchUrlState {
    const sort = params.get("sort");
    const excludeKeyword = params.get("excludeKeyword")?.trim();
    const filters: SearchParams = {
        excludeKeyword: excludeKeyword || undefined,
        status: pickAll(params, "status", statuses),
        platform: pickAll(params, "platform", platforms),
        minPrice: readPrice(params, "minPrice"),
        maxPrice: readPrice(params, "maxPrice"),
        condition: pickAll(params, "condition", conditions),
        defectStatus: pickAll(params, "defectStatus", defectStatuses),
    };
    if (
        filters.minPrice !== undefined &&
        filters.maxPrice !== undefined &&
        filters.minPrice > filters.maxPrice
    ) {
        filters.minPrice = undefined;
        filters.maxPrice = undefined;
    }

    return {
        keyword: params.get("keyword")?.trim() ?? "",
        sort: sorts.includes(sort as SearchSort) ? (sort as SearchSort) : defaultSort,
        filters,
    };
}

/** 검색 상태를 URL 쿼리 문자열로 — 기본값(최신순)·빈 값은 넣지 않는다. 복수 값은 `status=A&status=B`. */
export function toSearchQuery({ keyword, sort, filters }: SearchUrlState) {
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("keyword", keyword.trim());
    if (sort !== defaultSort) params.set("sort", sort);
    if (filters.excludeKeyword) params.set("excludeKeyword", filters.excludeKeyword);
    const status = filters.status === undefined ? [] : [filters.status].flat();
    status.forEach((value) => params.append("status", value));
    filters.platform?.forEach((value) => params.append("platform", value));
    if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
    if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
    filters.condition?.forEach((value) => params.append("condition", value));
    filters.defectStatus?.forEach((value) => params.append("defectStatus", value));
    return params.toString();
}
