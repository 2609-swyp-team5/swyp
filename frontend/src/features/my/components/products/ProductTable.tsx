"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/common/components/ui/Button";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/common/components/ui/Table";
import { cn } from "@/common/lib/utils";
import type { MyProduct, MyProductStatus } from "@/features/my/types";
import { ProductTableSkeletonRows } from "@/features/my/components/products/ProductTableSkeletonRows";
import { RecommendationBadge } from "@/features/product-management/components/product-list/RecommendationBadge";
import { resolveSellerRecommendationBadge } from "@/features/product-management/utils/productManagementDisplay";

const cellClassName = "px-5 py-5";
// 휴대폰에서는 표를 카드 목록처럼 보이게 한다(행 = 카드, 열 이름 숨김).
const mobileCellClassName = "block p-0 md:table-cell md:px-5 md:py-5";
const statusLabels: Record<MyProductStatus, string> = {
    DRAFT: "임시저장",
    ON_SALE: "판매중",
    RESERVED: "예약중",
    SOLD_OUT: "판매완료",
};
const statusBadgeClassNames: Record<MyProductStatus, string> = {
    DRAFT: "bg-[#fff4f4] text-[#fa503d]",
    ON_SALE: "bg-[#fa503d] text-white",
    RESERVED: "bg-[#fa503d] text-white",
    SOLD_OUT: "bg-[#a9adbd] text-white",
};
export function ProductTable({
    products,
    isLoading,
    isError,
    isFetchingNextPage = false,
    hasNextPage = false,
    isFetchNextPageError = false,
    onLoadMore,
    onRetryLoadMore,
}: {
    products: readonly MyProduct[];
    isLoading: boolean;
    isError: boolean;
    isFetchingNextPage?: boolean;
    hasNextPage?: boolean;
    isFetchNextPageError?: boolean;
    onLoadMore?: () => void;
    onRetryLoadMore?: () => void;
}) {
    const router = useRouter();
    const listScrollRef = useRef<HTMLDivElement>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const root = listScrollRef.current;
        const target = loadMoreRef.current;
        if (
            !root ||
            !target ||
            !hasNextPage ||
            !onLoadMore ||
            isFetchingNextPage ||
            isFetchNextPageError ||
            isError
        ) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    onLoadMore();
                }
            },
            { root, rootMargin: "0px 0px 160px 0px" },
        );
        observer.observe(target);

        return () => observer.disconnect();
    }, [hasNextPage, isError, isFetchNextPageError, isFetchingNextPage, onLoadMore]);

    return (
        <div
            ref={listScrollRef}
            className="max-h-[420px] overflow-y-auto overscroll-contain rounded-[16px] border border-[#d3d3d3] md:max-h-[600px] md:rounded-[20px]"
        >
            <Table className="typography-body-small block table-fixed text-left md:table md:min-w-[740px]">
                {/* 상품 이름은 남는 폭, 나머지 열은 고정 폭으로 둔다. */}
                <colgroup>
                    <col />
                    <col className="w-[130px]" />
                    <col className="w-[130px]" />
                    <col className="w-[130px]" />
                </colgroup>
                <TableHeader className="hidden bg-[#fafbff] md:table-header-group">
                    <TableRow className="border-[#f1f1f1] hover:bg-[#fafbff]">
                        {["상품 이름", "가격", "상품 상태", "추천 상태"].map((label) => (
                            <TableHead
                                key={label}
                                className="typography-body-bold h-auto px-5 py-5 text-center font-semibold text-[#83889e] first:pl-[30px] first:text-left last:pr-[30px]"
                            >
                                {label}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody className="block md:table-row-group">
                    {isLoading ? (
                        <ProductTableSkeletonRows
                            count={5}
                            statusLabel="상품을 불러오는 중입니다."
                        />
                    ) : products.length === 0 && !isError ? (
                        <TableRow className="block md:table-row">
                            <TableCell
                                colSpan={4}
                                className={`${cellClassName} block text-center text-[#83889e] md:table-cell`}
                            >
                                <p role="status">해당 상태의 상품이 없습니다.</p>
                            </TableCell>
                        </TableRow>
                    ) : (
                        products.map((item) => {
                            const recommendationBadge = resolveSellerRecommendationBadge(
                                item.recommendation,
                            );

                            return (
                                <TableRow
                                    key={item.id}
                                    className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 border-[#d3d3d3] p-4 hover:bg-[#fafbff]/50 md:table-row md:p-0"
                                    onClick={(event) => {
                                        if (
                                            event.target instanceof Element &&
                                            event.target.closest("a")
                                        )
                                            return;
                                        router.push(`/sell/manage?selected=${item.id}`);
                                    }}
                                >
                                    <TableCell
                                        className={`${mobileCellClassName} col-span-2 font-medium break-all whitespace-normal text-[#363636] md:pl-[30px]`}
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="relative size-12 shrink-0 overflow-hidden rounded-[8px] bg-[#dfdfdf]">
                                                {item.thumbnailUrl ? (
                                                    <Image
                                                        src={item.thumbnailUrl}
                                                        alt=""
                                                        fill
                                                        unoptimized
                                                        sizes="48px"
                                                        className="object-cover"
                                                    />
                                                ) : null}
                                            </div>
                                            <Link
                                                href={`/sell/manage?selected=${item.id}`}
                                                className="hover:text-primary focus-visible:outline-primary block min-w-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
                                            >
                                                {item.title}
                                            </Link>
                                        </div>
                                    </TableCell>
                                    <TableCell
                                        className={`${mobileCellClassName} col-start-1 row-start-2 text-center text-[#363636] tabular-nums md:text-[#83889e]`}
                                    >
                                        {item.price.toLocaleString("ko-KR")}원
                                    </TableCell>
                                    <TableCell
                                        className={`${mobileCellClassName} col-start-2 row-start-2 justify-self-end text-center`}
                                    >
                                        <span
                                            className={cn(
                                                "typography-body-bold-small inline-flex h-6 items-center rounded-full px-2.5 font-semibold",
                                                statusBadgeClassNames[item.status],
                                            )}
                                        >
                                            {statusLabels[item.status]}
                                        </span>
                                    </TableCell>
                                    <TableCell
                                        className={`${mobileCellClassName} col-span-2 row-start-3 justify-self-center text-center md:table-cell`}
                                    >
                                        <RecommendationBadge
                                            badgeLabel={recommendationBadge}
                                            badgeTone={
                                                recommendationBadge === "SELL"
                                                    ? "primary"
                                                    : recommendationBadge === "HOLD"
                                                      ? "dark"
                                                      : "muted"
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                    {!isLoading && isFetchingNextPage && <ProductTableSkeletonRows count={3} />}
                </TableBody>
            </Table>
            {hasNextPage && !isError ? (
                <div ref={loadMoreRef} className="min-h-5" aria-hidden="true" />
            ) : null}
            {isFetchingNextPage ? (
                <p
                    role="status"
                    className="typography-body-small px-3 py-3 text-center text-[#83889e]"
                >
                    상품을 더 불러오는 중입니다.
                </p>
            ) : null}
            {isFetchNextPageError ? (
                <div className="flex flex-col items-center gap-2 px-3 py-3 text-center">
                    <p role="alert" className="typography-body-small text-[#d65353]">
                        상품을 더 불러오지 못했습니다.
                    </p>
                    {onRetryLoadMore ? (
                        <Button type="button" variant="outline" onClick={onRetryLoadMore}>
                            다시 시도
                        </Button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
