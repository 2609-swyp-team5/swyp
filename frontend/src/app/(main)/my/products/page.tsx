"use client";

import { useState } from "react";

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
import { MyPageContent } from "@/features/my/components/MyPageContent";
import { MY_PREVIEW_PRODUCTS } from "@/features/my/myPreviewData";

const filters = [
    { id: "all", label: "전체", accessibleLabel: "전체", count: 6 },
    { id: "selling", label: "판매상품", accessibleLabel: "판매 상품", count: 3 },
    { id: "interest", label: "관심상품", accessibleLabel: "관심 상품", count: 2 },
] as const;

export default function MyProductsPage() {
    const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
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
            <div
                role="group"
                aria-label="상품 분류"
                className="mb-[50px] flex flex-wrap gap-[10px] pt-[50px]"
            >
                {filters.map((item) => (
                    <Button
                        key={item.id}
                        type="button"
                        variant="outline"
                        aria-pressed={filter === item.id}
                        aria-label={`${item.accessibleLabel} ${item.count}`}
                        onClick={() => setFilter(item.id)}
                        className={cn(
                            "h-[30px] gap-[3px] rounded-full px-[15px] text-[13px] leading-5 tracking-[-0.5px]",
                            filter === item.id
                                ? "border-[#5d55fe] bg-[#5d55fe] text-white hover:bg-[#5d55fe]/90 hover:text-white"
                                : "border-[#d3d3d3] bg-white text-[#83889e] hover:border-[#5d55fe] hover:bg-white hover:text-[#5d55fe]",
                        )}
                    >
                        {item.label}
                        <span>{item.count}</span>
                    </Button>
                ))}
            </div>
            <Table className="min-w-[760px] table-fixed text-left">
                <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[17%]" />
                    <col className="w-[17%]" />
                    <col className="w-[17%]" />
                    <col className="w-[21%]" />
                </colgroup>
                <TableHeader className="bg-[#fafbff]">
                    <TableRow className="border-[#fafbff] hover:bg-[#fafbff]">
                        {["상품 이름", "가격", "플랫폼", "상품 상태", "시세 변동"].map((label) => (
                            <TableHead
                                key={label}
                                className="h-[65px] px-3 text-[16px] font-semibold tracking-[0.5px] text-[#83889e] first:pl-[30px] last:pr-[30px]"
                            >
                                {label}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map((item) => (
                        <TableRow key={item.id} className="border-[#d3d3d3] hover:bg-[#fafbff]/50">
                            <TableCell className="py-4 pr-3 pl-6 text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#363636]">
                                {item.name}
                            </TableCell>
                            <TableCell className="px-3 py-4 text-[16px] leading-[25px] text-[#83889e] tabular-nums">
                                {item.price.toLocaleString("ko-KR")}원
                            </TableCell>
                            <TableCell className="px-3 py-4">
                                <span className="inline-flex rounded-full bg-[#fafbff] px-[10px] py-1 text-[12px] leading-4 font-semibold text-[#83889e]">
                                    {item.platform}
                                </span>
                            </TableCell>
                            <TableCell className="px-3 py-4">
                                <span
                                    className={cn(
                                        "inline-flex rounded-full bg-[#fafbff] px-[10px] py-1 text-[12px] leading-[18px] font-semibold",
                                        item.status === "판매 중"
                                            ? "text-[#6653fb]"
                                            : "text-[#83889e]",
                                    )}
                                >
                                    {item.status}
                                </span>
                            </TableCell>
                            <TableCell
                                className={cn(
                                    "px-3 py-4 text-[13px] leading-5 font-semibold tabular-nums last:pr-[30px]",
                                    item.change === null
                                        ? "text-[#83889e]"
                                        : item.change > 0
                                          ? "text-[#6b6c7b]"
                                          : "text-[#fa503d]",
                                )}
                            >
                                {item.change === null
                                    ? "—"
                                    : (item.change > 0 ? "+" : "") + item.change + "%"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </MyPageContent>
    );
}
