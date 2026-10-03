import type { ProductStatus, ProductSummaryResponse } from "../types";

export const mockProducts: ProductSummaryResponse[] = [
    {
        id: 1,
        title: "아이패드 프로 11인치 4세대",
        brand: "Apple",
        price: 800000,
        status: "ON_SALE",
        condition: "A",
        defectStatus: "NORMAL",
        purchasedMonths: 8,
        categoryName: "전자기기",
        thumbnailUrl: null,
        recommendation: "HOLD",
        marketAveragePrice: 823000,
        createdAt: "2026-09-20T10:00:00",
    },
    {
        id: 2,
        title: "Nikon FM2 필름카메라",
        brand: "Nikon",
        price: 335000,
        status: "DRAFT",
        condition: "B",
        defectStatus: "NORMAL",
        purchasedMonths: 6,
        categoryName: "카메라",
        thumbnailUrl: null,
        recommendation: "HOLD",
        marketAveragePrice: null,
        createdAt: "2026-09-27T14:32:00",
    },
    {
        id: 3,
        title: "아이폰 13 미니 128GB",
        brand: "Apple",
        price: 320000,
        status: "SOLD_OUT",
        condition: "A",
        defectStatus: "NORMAL",
        purchasedMonths: 12,
        categoryName: "전자기기",
        thumbnailUrl: null,
        recommendation: "SELL",
        marketAveragePrice: 350000,
        createdAt: "2026-09-15T10:00:00",
    },
];

export function getMyProductsMock(status?: ProductStatus) {
    const content = status
        ? mockProducts.filter((product) => product.status === status)
        : mockProducts;

    return Promise.resolve({
        content,
        nextCursor: null,
        hasNext: false,
    });
}
