import type { CursorPageResponse } from "@/common/lib/api/types";
import type { ProductStatus, ProductSummaryResponse } from "@/features/sell/types";

export type MyProductStatus = ProductStatus;
export type MyProductFilter = "ALL" | MyProductStatus;

export interface MyProductsParams {
    cursor?: string;
    size: number;
}

export type MyProduct = ProductSummaryResponse & {
    platformName: string | null;
};

export type MyProductsResponse = CursorPageResponse<ProductSummaryResponse>;
