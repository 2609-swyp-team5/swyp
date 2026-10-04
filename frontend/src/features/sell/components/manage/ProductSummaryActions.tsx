"use client";

import { useState } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/common/components/ui/Button";
import { SellAlertDialog } from "@/features/sell/components/shared/SellAlertDialog";
import { useDeleteProductMutation } from "@/features/sell/hooks/mutations/useDeleteProductMutation";
import { useUpdateProductStatusMutation } from "@/features/sell/hooks/mutations/useUpdateProductStatusMutation";
import type { ProductResponse } from "@/features/sell/types";

type ProductSummaryActionsProps = {
    product: Pick<ProductResponse, "id">;
    editHref: string;
    onDeleted?: () => void;
    canMarkAsSold?: boolean;
};

export function ProductSummaryActions({
    product,
    editHref,
    onDeleted,
    canMarkAsSold = false,
}: ProductSummaryActionsProps) {
    const router = useRouter();
    const deleteProductMutation = useDeleteProductMutation();
    const updateProductStatusMutation = useUpdateProductStatusMutation();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSoldDialogOpen, setIsSoldDialogOpen] = useState(false);

    const handleDelete = () => {
        deleteProductMutation.mutate(product.id, {
            onSuccess: () => {
                setIsDeleteDialogOpen(false);
                onDeleted?.();
                if (!onDeleted) {
                    router.replace("/sell/manage");
                }
            },
        });
    };

    const handleMarkAsSold = () => {
        updateProductStatusMutation.mutate(
            { id: product.id, status: "SOLD_OUT" },
            {
                onSuccess: () => {
                    setIsSoldDialogOpen(false);
                },
            },
        );
    };

    return (
        <>
            <div className="flex items-center justify-end gap-[30px]">
                {canMarkAsSold ? (
                    <Button
                        type="button"
                        variant="ghost"
                        className="h-auto flex-col gap-2 rounded-xl p-2.5 text-[#83889e] hover:bg-[#f5f3ff] hover:text-[#6653fb]"
                        onClick={() => setIsSoldDialogOpen(true)}
                        disabled={updateProductStatusMutation.isPending}
                    >
                        <Image src="/sell/sold-out.svg" alt="" width={40} height={40} />
                        <span className="text-[16px] leading-[25px] font-normal">판매완료</span>
                    </Button>
                ) : null}
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
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push(editHref)}
                    className="h-auto flex-col gap-2 rounded-xl p-2.5 text-[#83889e] hover:bg-[#f5f3ff] hover:text-[#6653fb]"
                >
                    <Image src="/sell/pencil.svg" alt="" width={40} height={40} />
                    <span className="text-[16px] leading-[25px] font-normal">수정하기</span>
                </Button>
            </div>

            <SellAlertDialog
                open={isSoldDialogOpen}
                onClose={() => {
                    setIsSoldDialogOpen(false);
                    updateProductStatusMutation.reset();
                }}
                onConfirm={handleMarkAsSold}
                title="판매완료로 변경할까요?"
                description={
                    <>
                        판매완료로 변경한 상품은 판매 완료 목록에서 확인할 수 있어요.
                        {updateProductStatusMutation.error && (
                            <span className="mt-2 block text-[#d65353]">
                                {updateProductStatusMutation.error.message}
                            </span>
                        )}
                    </>
                }
                confirmLabel={updateProductStatusMutation.isPending ? "변경 중..." : "판매완료"}
                cancelLabel="돌아가기"
                confirmDisabled={updateProductStatusMutation.isPending}
                cancelDisabled={updateProductStatusMutation.isPending}
                preventCloseOnConfirm
            />

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
        </>
    );
}
