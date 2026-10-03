export type MyProductStatus = "DRAFT" | "ON_SALE" | "SOLD_OUT";
export type MyProductFilter = "ALL" | MyProductStatus;

export interface MyProductsParams {
    cursor?: string;
    size: number;
}

export interface MyProduct {
    id: number;
    title: string;
    brand: string | null;
    price: number;
    platformName: string | null;
    status: MyProductStatus;
    condition: "S" | "A" | "B" | "C" | "D" | null;
    defectStatus: "NORMAL" | "ISSUES" | "UNKNOWN" | null;
    purchasedMonths: number | null;
    categoryName: string;
    thumbnailUrl: string | null;
    recommendation: "SELL" | "HOLD" | "BUY" | "WAIT" | null;
    marketAveragePrice: number | null;
    createdAt: string;
}

export interface MyProductsResponse {
    content: MyProduct[];
    nextCursor: string | null;
    hasNext: boolean;
}
