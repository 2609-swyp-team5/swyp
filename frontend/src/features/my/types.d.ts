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

export type MyPlatformType = "BUNJANG";
export type MyPlatformStatus = "CONNECTED" | "EXPIRED" | "DISCONNECTED";

export interface MyPlatformConnectionState {
    status: MyPlatformStatus;
    updatedAt: string | null;
}

export interface MyPlatformConnection extends MyPlatformConnectionState {
    platform: MyPlatformType;
    platformName: string;
}

export type MyPlatformConnectionAction =
    | { platform: MyPlatformType; action: "connect"; cookie: string }
    | { platform: MyPlatformType; action: "disconnect" };
