"use client";

import { useState } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/common/components/ui/Button";
import { SellAlertDialog } from "@/features/sell/components/shared/SellAlertDialog";
import { useDeleteProductMutation } from "@/features/sell/hooks/mutations/useDeleteProductMutation";
import type { ProductResponse } from "@/features/sell/types";

type ProductSummaryActionsProps = {
    product: Pick<ProductResponse, "id">;
    editHref: string;
    onDeleted?: () => void;
};

export function ProductSummaryActions({
    product,
    editHref,
    onDeleted,
}: ProductSummaryActionsProps) {
    const router = useRouter();
    const deleteProductMutation = useDeleteProductMutation();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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

    return (
        <>
            <div className="flex items-center justify-end gap-[30px]">
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
