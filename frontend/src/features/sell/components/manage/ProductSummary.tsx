"use client";

import { useState } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/common/components/ui/Button";
import { SellAlertDialog } from "@/features/sell/components/shared/SellAlertDialog";
import { useDeleteProductMutation } from "@/features/sell/hooks/mutations/useDeleteProductMutation";
import type { ProductResponse } from "@/features/sell/types";
import { ProductGallery } from "@/features/sell/components/manage/ProductGallery";
import {
    conditionLabels,
    formatRegisteredAt,
    priceFormatter,
    statusLabels,
} from "@/features/sell/components/manage/productReviewUtils";

type ProductSummaryProps = {
    product: ProductResponse;
    registrationMethod: "ai" | "direct";
};

export function ProductSummary({ product, registrationMethod }: ProductSummaryProps) {
    const router = useRouter();
    const deleteProductMutation = useDeleteProductMutation();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleEdit = () => {
        router.push(`/sell/manage/${product.id}/edit?method=${registrationMethod}`);
    };

    const handleDelete = () => {
        deleteProductMutation.mutate(product.id, {
            onSuccess: () => {
                setIsDeleteDialogOpen(false);
                router.replace("/sell/manage");
            },
        });
    };

    return (
        <section aria-labelledby="product-summary-title" className="bg-white">
            <h2 id="product-summary-title" className="sr-only">
                등록된 상품 요약
            </h2>
            <div className="flex flex-col gap-8 lg:flex-row lg:gap-[50px]">
                <ProductGallery product={product} />

                <div className="flex min-w-0 flex-1 flex-col py-2.5 lg:min-h-[432px]">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-[#fff4f4] px-5 py-1 text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#fa503d]">
                            {statusLabels[product.status]}
                        </span>
                        <span className="text-[12px] leading-5 font-normal tracking-[-0.5px] text-[#6b6c7b]">
                            {formatRegisteredAt(product.createdAt)}
                        </span>
                    </div>
                    <h3 className="mt-4 text-[30px] leading-[42px] font-bold tracking-[0.5px] break-keep text-[#363636]">
                        {product.title}
                    </h3>
                    <p className="mt-1 text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#6653fb]">
                        {priceFormatter.format(product.price)}원
                    </p>
                    <div className="mt-4 flex flex-wrap gap-5">
                        <span className="rounded-full border border-[#d3d3d3] bg-[#fafbff] px-5 py-2.5 text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#83889e]">
                            {product.category.name}
                        </span>
                        <span className="rounded-full border border-[#d3d3d3] bg-[#fafbff] px-5 py-2.5 text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#6653fb]">
                            {conditionLabels[product.condition]}
                        </span>
                    </div>

                    <div className="mt-auto flex items-center justify-end gap-[30px]">
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-auto flex-col gap-2 rounded-xl p-2.5 text-[#83889e] hover:bg-[#f5f3ff] hover:text-[#6653fb]"
                            onClick={() => setIsDeleteDialogOpen(true)}
                            disabled={deleteProductMutation.isPending}
                        >
                            <Image src="/sell/trash.svg" alt="" width={40} height={40} />
                            <span className="text-[16px] leading-[25px] font-normal">삭제하기</span>
                        </Button>
                        <div className="h-7 w-px bg-[#dedee6]" aria-hidden="true" />
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleEdit}
                            className="h-auto flex-col gap-2 rounded-xl p-2.5 text-[#83889e] hover:bg-[#f5f3ff] hover:text-[#6653fb]"
                        >
                            <Image src="/sell/pencil.svg" alt="" width={40} height={40} />
                            <span className="text-[16px] leading-[25px] font-normal">수정하기</span>
                        </Button>
                    </div>
                </div>
            </div>

            <SellAlertDialog
                open={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false);
                    deleteProductMutation.reset();
                }}
                onConfirm={handleDelete}
                title="상품을 삭제할까요?"
                description={
                    <>
                        삭제한 상품은 다시 복구할 수 없습니다.
                        {deleteProductMutation.error && (
                            <span className="mt-2 block text-[#d65353]">
                                {deleteProductMutation.error.message}
                            </span>
                        )}
                    </>
                }
                confirmLabel={deleteProductMutation.isPending ? "삭제 중..." : "삭제하기"}
                cancelLabel="돌아가기"
                confirmDisabled={deleteProductMutation.isPending}
                cancelDisabled={deleteProductMutation.isPending}
                preventCloseOnConfirm
            />
        </section>
    );
}
