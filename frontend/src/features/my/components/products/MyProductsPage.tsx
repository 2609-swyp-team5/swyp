"use client";

import { useState } from "react";

import { MyPageContent } from "@/features/my/components/MyPageContent";
import { MY_PREVIEW_PRODUCTS } from "@/features/my/myPreviewData";

import {
    ProductFilters,
    type ProductFilter,
} from "@/features/my/components/products/ProductFilters";
import { ProductTable } from "@/features/my/components/products/ProductTable";

export function MyProductsPage() {
    const [filter, setFilter] = useState<ProductFilter>("all");
    const products = MY_PREVIEW_PRODUCTS.filter(
        (item) => filter === "all" || item.status === (filter === "selling" ? "판매 중" : "관심"),
    );
    return (
        <MyPageContent
            eyebrow="판매 관리"
            title="등록된 상품 확인"
            eyebrowClassName="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#83889e]"
            titleClassName="text-[32px] leading-[42px] tracking-[0.5px] text-[#1a1f35] sm:text-[40px] sm:leading-[50px] xl:text-[53px] xl:leading-[75px]"
        >
            <ProductFilters filter={filter} onFilterChange={setFilter} />
            <ProductTable products={products} />
        </MyPageContent>
    );
}
