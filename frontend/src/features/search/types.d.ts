// 우리 상품의 거래 상태 필터
export type SearchStatus = "DRAFT" | "ON_SALE" | "SOLD_OUT";
export type SearchPlatform = "ALL" | "BUNJANG" | "OUR";
export type SearchSort = "RECOMMENDED" | "LATEST" | "INTEREST" | "PRICE_HIGH" | "PRICE_LOW";
export type SearchTradeStatus = "SELLING" | "RESERVED" | "SOLD_OUT";
export type SearchCondition = "S" | "A" | "B" | "C" | "D";
export type SearchDefectStatus = "NORMAL" | "ISSUES" | "UNKNOWN";

// 상품 목록 조회 요청 파라미터
export interface SearchParams {
    keyword?: string;
    excludeKeyword?: string;
    status?: SearchStatus;
    tradeStatus?: SearchTradeStatus[];
    platform?: Exclude<SearchPlatform, "ALL">[];
    minPrice?: number;
    maxPrice?: number;
    condition?: SearchCondition[];
    defectStatus?: SearchDefectStatus[];
    sort?: SearchSort;
    cursor?: string;
    size?: number;
}

// 우리 상품과 외부 매물의 통합 목록 항목
export interface SearchResultItem {
    source: "OUR" | "EXTERNAL";
    id: number;
    title: string;
    brand: string | null;
    price: number;
    status: string;
    condition: SearchCondition | null;
    defectStatus: SearchDefectStatus | null;
    purchasedMonths: number | null;
    categoryName: string;
    tradeRegion: string | null;
    deliveryAvailable: boolean;
    thumbnailUrl: string | null;
    recommendation: "SELL" | "HOLD" | "BUY" | "WAIT" | null;
    marketAveragePrice: number | null;
    platformName: string | null;
    externalUrl: string | null;
    createdAt: string;
}

// 커서 기반 상품 목록 조회 결과
export interface SearchResponse {
    content: SearchResultItem[];
    nextCursor: string | null;
    hasNext: boolean;
}

export interface SearchProductDetail {
    source: "OUR" | "EXTERNAL";
    id: number;
    title: string;
    description: string | null;
    price: number;
    status: SearchStatus;
    category: { id: number; name: string; parentId: number | null; leaf: boolean };
    imageUrls: string[];
    platformName: string | null;
    externalUrl: string | null;
    marketAveragePrice: number | null;
    updatedAt: string;
}
