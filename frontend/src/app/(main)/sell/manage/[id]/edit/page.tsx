"use client";

import { useParams, useSearchParams } from "next/navigation";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { ProductEditForm } from "@/features/sell/components/edit/ProductEditForm";
import { useCategoriesQuery } from "@/features/sell/hooks/queries/useCategoriesQuery";
import { useProductQuery } from "@/features/sell/hooks/queries/useProductQuery";

type RegistrationMethod = "ai" | "direct";

function LoadingStatus({ children }: { children: string }) {
    return (
        <main className="flex flex-1 items-center justify-center bg-white px-6 py-24">
            <p className="text-center text-lg font-semibold text-[#6b6c7b]">{children}</p>
        </main>
    );
}

export default function ProductEditPage() {
    const params = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const productId = Number(params.id);
    const method: RegistrationMethod = searchParams.get("method") === "direct" ? "direct" : "ai";
    const { data: product, error, isPending } = useProductQuery(productId);
    const {
        data: categories = [],
        isPending: isCategoriesPending,
        isError: isCategoriesError,
    } = useCategoriesQuery();

    if (!Number.isInteger(productId) || productId <= 0) {
        return <LoadingStatus>올바르지 않은 상품입니다.</LoadingStatus>;
    }

    if (isPending) {
        return <LoadingStatus>판매글을 불러오는 중이에요.</LoadingStatus>;
    }

    if (error || !product) {
        return <LoadingStatus>{getApiErrorMessage(error)}</LoadingStatus>;
    }

    const categoryStatus = isCategoriesPending ? "loading" : isCategoriesError ? "error" : "ready";

    return (
        <ProductEditForm
            key={product.id}
            product={product}
            categories={categories}
            categoryStatus={categoryStatus}
            method={method}
        />
    );
}
