"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

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

const cellClassName = "px-5 py-5";
const statusLabels: Record<MyProductStatus, string> = {
    DRAFT: "임시저장",
    ON_SALE: "판매중",
    RESERVED: "예약중",
    SOLD_OUT: "판매완료",
};

export function ProductTable({
    products,
    isLoading,
    isError,
    isFetchingNextPage = false,
}: {
    products: readonly MyProduct[];
    isLoading: boolean;
    isError: boolean;
    isFetchingNextPage?: boolean;
}) {
    const router = useRouter();
    return (
        <div className="overflow-hidden rounded-[20px] border border-[#d3d3d3]">
            <Table className="typography-body-small min-w-[740px] table-fixed text-left">
                {/* Figma 헤더: 상품 이름은 남는 폭, 나머지는 130px 고정(시세 변동은 100px + 오른쪽 여백 30px) — 셀 왼쪽 여백 20px 포함 */}
                <colgroup>
                    <col />
                    <col className="w-[130px]" />
                    <col className="w-[130px]" />
                    <col className="w-[130px]" />
                    <col className="w-[150px]" />
                </colgroup>
                <TableHeader className="bg-[#fafbff]">
                    <TableRow className="border-[#f1f1f1] hover:bg-[#fafbff]">
                        {["상품 이름", "가격", "플랫폼", "상품 상태", "시세 변동"].map((label) => (
                            <TableHead
                                key={label}
                                className="typography-body-bold h-auto px-5 py-5 font-semibold text-[#83889e] first:pl-[30px] last:pr-[30px]"
                            >
                                {label}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <ProductTableSkeletonRows
                            count={5}
                            statusLabel="상품을 불러오는 중입니다."
                        />
                    ) : products.length === 0 && !isError ? (
                        <TableRow>
                            <TableCell
                                colSpan={5}
                                className={`${cellClassName} text-center text-[#83889e]`}
                            >
                                <p role="status">해당 상태의 상품이 없습니다.</p>
                            </TableCell>
                        </TableRow>
                    ) : (
                        products.map((item) => (
                            <TableRow
                                key={item.id}
                                className="cursor-pointer border-[#d3d3d3] hover:bg-[#fafbff]/50"
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
                                    className={`${cellClassName} font-medium break-all whitespace-normal text-[#363636]`}
                                >
                                    <Link
                                        href={`/sell/manage?selected=${item.id}`}
                                        className="hover:text-primary focus-visible:outline-primary block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
                                    >
                                        {item.title}
                                    </Link>
                                </TableCell>
                                <TableCell
                                    className={`${cellClassName} text-[#83889e] tabular-nums`}
                                >
                                    {item.price.toLocaleString("ko-KR")}원
                                </TableCell>
                                <TableCell className={cellClassName}>
                                    <span className="inline-flex max-w-full rounded-full bg-[#fafbff] px-[10px] py-1 font-medium break-all whitespace-normal text-[#83889e]">
                                        {item.platformName || "—"}
                                    </span>
                                </TableCell>
                                <TableCell className={cellClassName}>
                                    <span
                                        className={cn(
                                            "inline-flex rounded-full px-[10px] py-1 font-medium",
                                            item.status === "ON_SALE"
                                                ? "bg-[#fff1f0] text-[#fa503d]"
                                                : "bg-[#fafbff] text-[#83889e]",
                                        )}
                                    >
                                        {statusLabels[item.status]}
                                    </span>
                                </TableCell>
                                <TableCell
                                    className={`${cellClassName} text-[#83889e] tabular-nums`}
                                >
                                    —
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                    {!isLoading && isFetchingNextPage && <ProductTableSkeletonRows count={3} />}
                </TableBody>
            </Table>
        </div>
    );
}
