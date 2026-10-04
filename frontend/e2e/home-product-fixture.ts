import type { ProductSummaryResponse } from "../src/features/sell/types";

export const popularProducts: ProductSummaryResponse[] = Array.from({ length: 10 }, (_, index) => ({
    id: 701 + index,
    title: `인기 상품 ${index + 1}`,
    brand: null,
    price: 10000 + index * 1000,
    status: index === 1 ? "SOLD_OUT" : "ON_SALE",
    condition: "A",
    defectStatus: "NORMAL",
    purchasedMonths: null,
    categoryName: "전자기기",
    thumbnailUrl:
        index === 0
            ? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII="
            : null,
    recommendation: null,
    marketAveragePrice: index === 1 ? null : 20000,
    createdAt: "2026-10-04T10:00:00",
}));
