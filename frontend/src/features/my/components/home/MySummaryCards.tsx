"use client";

import { Button } from "@/common/components/ui/Button";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useMyProductsQuery } from "@/features/my/hooks/queries/useMyProductsQuery";

export function MySummaryCards() {
    const { data: products, isPending, isError, error, refetch } = useMyProductsQuery();
    const summaries = [
        {
            title: "등록한 물건",
            value: products ? `${products.length}개` : "—",
            description: isError
                ? getApiErrorMessage(error)
                : products
                  ? `등록됨 ${products.filter((product) => product.status === "DRAFT").length} · 판매중 ${products.filter((product) => product.status === "ON_SALE").length} · 판매완료 ${products.filter((product) => product.status === "SOLD_OUT").length}`
                  : "상품을 불러오는 중입니다.",
        },
        { title: "AI 추천 알림", value: "2건", description: "오늘 새로 분석한 타이밍" },
        { title: "평균 시세 대비", value: "+4.1%", description: "내 물건들의 전체 시세 평균" },
        { title: "최근 분석일", value: "오늘", description: "2026년 9월 9일 오전 9:12" },
    ];
    return (
        <section aria-label="거래 요약" className="mt-[60px] grid gap-[10px] sm:grid-cols-2">
            {summaries.map((item) => (
                <article
                    key={item.title}
                    className="flex flex-col justify-between gap-3 rounded-[10px] border border-[#d3d3d3] bg-white p-6"
                >
                    <div>
                        <h2 className="text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#464646]">
                            {item.title}
                        </h2>
                        <p className="text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#6653fb]">
                            {item.value}
                        </p>
                    </div>
                    <div>
                        <p
                            role={
                                item.title === "등록한 물건"
                                    ? isError
                                        ? "alert"
                                        : isPending
                                          ? "status"
                                          : undefined
                                    : undefined
                            }
                            className="text-base leading-[25px] text-[#464646]"
                        >
                            {item.description}
                        </p>
                        {item.title === "등록한 물건" && isError && (
                            <Button
                                type="button"
                                variant="outline"
                                className="mt-3"
                                onClick={() => void refetch()}
                            >
                                다시 시도
                            </Button>
                        )}
                    </div>
                </article>
            ))}
        </section>
    );
}
