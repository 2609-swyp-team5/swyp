"use client";

import { useState } from "react";

import { Button } from "@/common/components/ui/Button";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { MyPageContent } from "@/features/my/components/MyPageContent";
import { ProductFilters } from "@/features/my/components/products/ProductFilters";
import { ProductTable } from "@/features/my/components/products/ProductTable";
import { useMyProductsQuery } from "@/features/my/hooks/queries/useMyProductsQuery";
import type { MyProductFilter } from "@/features/my/types";

export function MyProductsPage() {
    const [filter, setFilter] = useState<MyProductFilter>("ALL");
    const { data, isPending, isError, error, refetch } = useMyProductsQuery();
    const counts = data?.reduce<Record<MyProductFilter, number>>(
        (result, product) => {
            result[product.status] += 1;
            return result;
        },
        { ALL: data.length, DRAFT: 0, ON_SALE: 0, SOLD_OUT: 0 },
    );
    const products = data?.filter((product) => filter === "ALL" || product.status === filter) ?? [];
    return (
        <MyPageContent
            eyebrow="판매 관리"
            title="등록된 상품 확인"
            eyebrowClassName="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#83889e]"
            titleClassName="text-[#1a1f35]"
        >
            <ProductFilters filter={filter} onFilterChange={setFilter} counts={counts} />
            <ProductTable products={products} isLoading={isPending} isError={isError} />
            {isError && (
                <div className="mt-4 flex flex-col items-start gap-4">
                    <p role="alert" className="text-[#fa503d]">
                        {getApiErrorMessage(error)}
                    </p>
                    <Button type="button" variant="outline" onClick={() => void refetch()}>
                        다시 시도
                    </Button>
                </div>
            )}
        </MyPageContent>
    );
}
