"use client";

import { useState } from "react";

import { Badge } from "@/common/components/ui/Badge";
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
import { MyPageContent, MyPanel } from "@/features/my/components/MyPageContent";
import { MY_PREVIEW_PRODUCTS } from "@/features/my/myPreviewData";

const filters = [
    { id: "all", label: "전체", count: 6 },
    { id: "selling", label: "판매 상품", count: 3 },
    { id: "interest", label: "관심 상품", count: 2 },
] as const;

export default function MyProductsPage() {
    const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
    const products = MY_PREVIEW_PRODUCTS.filter(
        (item) => filter === "all" || item.status === (filter === "selling" ? "판매 중" : "관심"),
    );
    return (
        <MyPageContent eyebrow="판매 관리" title="등록된 상품 확인">
            <div role="group" aria-label="상품 분류" className="mb-6 flex flex-wrap gap-2">
                {filters.map((item) => (
                    <Button
                        key={item.id}
                        type="button"
                        variant={filter === item.id ? "default" : "outline"}
                        aria-pressed={filter === item.id}
                        onClick={() => setFilter(item.id)}
                        className="h-10 gap-2 rounded-xl px-4 text-base"
                    >
                        {item.label}
                        <span className="text-[13px] opacity-70">{item.count}</span>
                    </Button>
                ))}
            </div>
            <MyPanel className="p-0">
                <Table className="min-w-[740px] text-base">
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            {["상품명", "가격", "플랫폼", "상태", "시세 변동"].map((label) => (
                                <TableHead
                                    key={label}
                                    className="text-muted-foreground h-12 px-6 text-[13px] font-semibold"
                                >
                                    {label}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="px-6 py-5 font-semibold">
                                    {item.name}
                                </TableCell>
                                <TableCell className="px-6 py-5 tabular-nums">
                                    {item.price.toLocaleString("ko-KR")}원
                                </TableCell>
                                <TableCell className="px-6 py-5">
                                    <Badge
                                        variant="secondary"
                                        className="text-muted-foreground rounded-md text-[13px]"
                                    >
                                        {item.platform}
                                    </Badge>
                                </TableCell>
                                <TableCell
                                    className={cn(
                                        "px-6 py-5 text-[13px] font-semibold",
                                        item.status === "판매 중"
                                            ? "text-primary"
                                            : item.status === "관심"
                                              ? "text-amber-600"
                                              : "text-green-600",
                                    )}
                                >
                                    {item.status}
                                </TableCell>
                                <TableCell
                                    className={cn(
                                        "px-6 py-5 text-[13px] font-semibold tabular-nums",
                                        item.change === null
                                            ? "text-muted-foreground"
                                            : item.change > 0
                                              ? "text-green-600"
                                              : "text-destructive",
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
            </MyPanel>
        </MyPageContent>
    );
}
