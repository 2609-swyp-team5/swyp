export type SearchStatus = "ON_SALE" | "RESERVED" | "SOLD_OUT" | "HIDDEN";

export interface SearchParams {
    keyword?: string;
    status?: SearchStatus;
    cursor?: number;
    size?: number;
}

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

export interface SearchResponse {
    content: SearchResultItem[];
    nextCursor: number | null;
    hasNext: boolean;
}
