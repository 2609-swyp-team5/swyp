// 우리 상품의 거래 상태 필터
export type SearchStatus = "DRAFT" | "ON_SALE" | "SOLD_OUT";
export type SearchPlatform = "ALL" | "BUNJANG" | "OUR";

// 상품 목록 조회 요청 파라미터
export interface SearchParams {
    keyword?: string;
    status?: SearchStatus;
    cursor?: number;
    size: number;
}

// 우리 상품과 외부 매물의 통합 목록 항목
export interface SearchResultItem {
    source: "OUR" | "EXTERNAL";
    id: number;
    title: string;
    brand: string | null;
    price: number;
    status: string;
    condition: "S" | "A" | "B" | "C" | "D" | null;
    defectStatus: "NORMAL" | "ISSUES" | "UNKNOWN" | null;
    purchasedMonths: number | null;
    categoryName: string;
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
    nextCursor: number | null;
    hasNext: boolean;
}
