"use client";

import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/common/components/ui/Table";
import { cn } from "@/common/lib/utils";
import type { MY_PREVIEW_PRODUCTS } from "@/features/my/myPreviewData";

const cellClassName = "px-3 py-4";

export function ProductTable({
    products,
}: {
    products: readonly (typeof MY_PREVIEW_PRODUCTS)[number][];
}) {
    return (
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
                        <TableCell
                            className={`${cellClassName} text-[16px] leading-[25px] text-[#83889e] tabular-nums`}
                        >
                            {item.price.toLocaleString("ko-KR")}원
                        </TableCell>
                        <TableCell className={cellClassName}>
                            <span className="inline-flex rounded-full bg-[#fafbff] px-[10px] py-1 text-[12px] leading-4 font-semibold text-[#83889e]">
                                {item.platform}
                            </span>
                        </TableCell>
                        <TableCell className={cellClassName}>
                            <span
                                className={cn(
                                    "inline-flex rounded-full bg-[#fafbff] px-[10px] py-1 text-[12px] leading-[18px] font-semibold",
                                    item.status === "판매 중" ? "text-[#6653fb]" : "text-[#83889e]",
                                )}
                            >
                                {item.status}
                            </span>
                        </TableCell>
                        <TableCell
                            className={cn(
                                cellClassName,
                                "text-[13px] leading-5 font-semibold tabular-nums last:pr-[30px]",
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
    );
}
