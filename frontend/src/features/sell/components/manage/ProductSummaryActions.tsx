"use client";

import { useState } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/common/components/ui/Button";
import { Input } from "@/common/components/ui/Input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/common/components/ui/Select";
import { platformDefinitions } from "@/features/my/platformDefinitions";
import { FieldLabel } from "@/features/sell/components/direct-register/DirectRegisterFields";
import { SellAlertDialog } from "@/features/sell/components/shared/SellAlertDialog";
import { useDeleteProductMutation } from "@/features/sell/hooks/mutations/useDeleteProductMutation";
import { useUpdateProductStatusMutation } from "@/features/sell/hooks/mutations/useUpdateProductStatusMutation";
import type { ProductResponse } from "@/features/sell/types";

type ProductSummaryActionsProps = {
    product: Pick<ProductResponse, "id" | "price">;
    actionHref: string;
    actionLabel?: string;
    actionIconSrc?: string;
    onDeleted?: () => void;
    canMarkAsSold?: boolean;
};

const soldPlatformOptions = Object.entries(platformDefinitions).map(([value, definition]) => ({
    value,
    label: definition.name,
}));

const fieldClassName =
    "h-[50px] rounded-[8px] border border-[#d3d3d3] bg-[#fafbff] px-4 py-3 text-[16px] leading-[25px] text-[#6b6c7b] shadow-none placeholder:text-[#d3d3d3] focus-visible:border-[#6653fb] focus-visible:ring-0";

function formatSoldPriceInput(value: string) {
    const digits = value.replace(/\D/g, "");

    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseSoldPrice(value: string) {
    const parsed = Number(value.replace(/,/g, ""));

    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function ProductSummaryActions({
    product,
    actionHref,
    actionLabel = "수정하기",
    actionIconSrc = "/sell/pencil.svg",
    onDeleted,
    canMarkAsSold = false,
}: ProductSummaryActionsProps) {
    const router = useRouter();
    const deleteProductMutation = useDeleteProductMutation();
    const updateProductStatusMutation = useUpdateProductStatusMutation();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSoldDialogOpen, setIsSoldDialogOpen] = useState(false);
    const [soldPriceInput, setSoldPriceInput] = useState("");
    const [soldPlatform, setSoldPlatform] = useState(soldPlatformOptions[0]?.value ?? "");

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
        const soldPrice = parseSoldPrice(soldPriceInput);

        if (!soldPrice || !soldPlatform) return;

        updateProductStatusMutation.mutate(
            {
                id: product.id,
                status: "SOLD_OUT",
                soldPrice,
                soldPlatform,
            },
            {
                onSuccess: () => {
                    setIsSoldDialogOpen(false);
                },
            },
        );
    };

    const openSoldDialog = () => {
        updateProductStatusMutation.reset();
        setSoldPriceInput(product.price.toLocaleString("ko-KR"));
        setSoldPlatform(soldPlatformOptions[0]?.value ?? "");
        setIsSoldDialogOpen(true);
    };

    const soldPrice = parseSoldPrice(soldPriceInput);
    const isSoldFormValid = soldPrice !== null && Boolean(soldPlatform);

    return (
        <>
            <div className="flex items-center justify-end gap-[30px]">
                {canMarkAsSold ? (
                    <Button
                        type="button"
                        variant="ghost"
                        className="h-auto flex-col gap-2 rounded-xl p-2.5 text-[#83889e] hover:bg-[#f5f3ff] hover:text-[#6653fb]"
                        onClick={openSoldDialog}
                        disabled={updateProductStatusMutation.isPending}
                    >
                        <Image src="/sell/sold-out.svg" alt="" width={40} height={40} />
                        <span className="text-[16px] leading-[25px] font-normal">판매완료</span>
                    </Button>
                ) : null}
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push(actionHref)}
                    className="h-auto flex-col gap-2 rounded-xl p-2.5 text-[#83889e] hover:bg-[#f5f3ff] hover:text-[#6653fb]"
                >
                    <Image src={actionIconSrc} alt="" width={40} height={40} />
                    <span className="text-[16px] leading-[25px] font-normal">{actionLabel}</span>
                </Button>
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
            </div>

            <SellAlertDialog
                open={isSoldDialogOpen}
                onClose={() => {
                    setIsSoldDialogOpen(false);
                    updateProductStatusMutation.reset();
                }}
                onConfirm={handleMarkAsSold}
                title="판매완료 정보를 입력해 주세요"
                description="최종 거래 가격과 플랫폼을 확인한 뒤 판매완료 처리할 수 있어요."
                content={
                    <div className="flex w-full flex-col gap-6 text-left">
                        <div className="flex flex-col gap-2.5">
                            <FieldLabel htmlFor="sold-price" required>
                                최종 거래 가격
                            </FieldLabel>
                            <div className="relative">
                                <Input
                                    id="sold-price"
                                    type="text"
                                    value={soldPriceInput}
                                    inputMode="numeric"
                                    aria-describedby="sold-price-unit"
                                    className={`${fieldClassName} pr-12 text-right`}
                                    onChange={(event) =>
                                        setSoldPriceInput(formatSoldPriceInput(event.target.value))
                                    }
                                />
                                <span
                                    id="sold-price-unit"
                                    className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[16px] leading-[25px] text-[#6b7395]"
                                >
                                    원
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2.5">
                            <FieldLabel htmlFor="sold-platform" required>
                                최종 거래 플랫폼
                            </FieldLabel>
                            <Select value={soldPlatform} onValueChange={setSoldPlatform}>
                                <SelectTrigger
                                    id="sold-platform"
                                    aria-label="최종 거래 플랫폼"
                                    className={`${fieldClassName} w-full justify-between`}
                                >
                                    <SelectValue placeholder="플랫폼을 선택해 주세요" />
                                </SelectTrigger>
                                <SelectContent
                                    position="popper"
                                    className="!w-[var(--radix-select-trigger-width)] !bg-white !text-[#6b6c7b]"
                                >
                                    {soldPlatformOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {updateProductStatusMutation.error ? (
                            <p className="text-[13px] leading-5 text-[#d65353]">
                                {updateProductStatusMutation.error.message}
                            </p>
                        ) : null}
                    </div>
                }
                confirmLabel={updateProductStatusMutation.isPending ? "처리 중..." : "판매완료"}
                cancelLabel="돌아가기"
                confirmDisabled={updateProductStatusMutation.isPending || !isSoldFormValid}
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
