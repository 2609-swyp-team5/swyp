"use client";

import { Button } from "@/common/components/ui/Button";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useHomeSummaryQuery } from "@/features/home/hooks/queries/useHomeSummaryQuery";
import { getHomeSummaryCards } from "@/features/home/utils/homeSummaryCards";

export function MySummaryCards() {
    const { data, isPending, isError, error, refetch } = useHomeSummaryQuery();
    const summaries = getHomeSummaryCards(data);
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
                            {isError
                                ? item.title === "등록한 물건"
                                    ? getApiErrorMessage(error)
                                    : "요약 정보를 불러오지 못했습니다."
                                : item.description}
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
