import type { SearchProductDetail } from "../src/features/search/types";

const image =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=";

export const detailProduct: SearchProductDetail = {
    source: "EXTERNAL",
    id: 1,
    title: "아이폰 13 미니 128GB 미드나이트",
    price: 345000,
    status: "ON_SALE",
    description: "상품 설명입니다.",
    category: { id: 1, name: "전자기기", parentId: null, leaf: true },
    imageUrls: [image, image],
    platformName: "번개장터",
    externalUrl: "https://example.com/product/1",
    marketAveragePrice: 363000,
    updatedAt: "2026-10-03T10:00:00",
};
