"use client";

import { Button } from "@/common/components/ui/Button";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useHomeSummaryQuery } from "@/features/home/hooks/queries/useHomeSummaryQuery";
import { getHomeSummaryCards } from "@/features/home/utils/homeSummaryCards";

export function MySummaryCards() {
    const { data, isPending, isError, error, refetch } = useHomeSummaryQuery();
    const summaries = getHomeSummaryCards(data);
    return (
        <section aria-label="거래 요약" className="mt-6 grid grid-cols-2 gap-[10px] md:mt-10">
            {summaries.map((item) => (
                <article
                    key={item.title}
                    className="flex flex-col justify-between gap-2 rounded-[10px] border border-[#d3d3d3] bg-[#fafbff] p-4 md:gap-3 md:p-6"
                >
                    <div>
                        <h2 className="typography-body-bold-small font-semibold text-[#464646]">
                            {item.title}
                        </h2>
                        <p className="typography-heading-02 font-medium text-[#6653fb]">
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
                            className="typography-body-medium break-keep text-[#464646]"
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
