"use client";

import { cn } from "@/common/lib/utils";

import { ProductManagementStreamingSkeleton } from "./ProductManagementStreamingSkeleton";
import type { ProductManagementStreamingSectionProps } from "./productManagementStreamingTypes";

export function ProductManagementStreamingSection<T>({
    step,
    title,
    query,
    getReadyMessage,
}: ProductManagementStreamingSectionProps<T>) {
    const isError = Boolean(query.error);

    return (
        <section
            aria-labelledby={`product-management-step-${step}-title`}
            className="rounded-[16px] border border-[#83889e] bg-[#fafbff] p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]"
        >
            <div className="mb-4 flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-[#6653fb] text-[16px] font-semibold text-white">
                    {step}
                </span>
                <h2
                    id={`product-management-step-${step}-title`}
                    className="text-[20px] leading-[30px] font-bold text-[#363636]"
                >
                    {title}
                </h2>
                <span className="ml-auto rounded-full bg-[#eeeefe] px-3 py-1 text-[11px] leading-4 font-semibold text-[#6653fb]">
                    mock
                </span>
            </div>

            {query.isPending ? (
                <ProductManagementStreamingSkeleton />
            ) : isError ? (
                <p className="rounded-[10px] bg-white px-4 py-6 text-center text-[14px] leading-5 text-[#d65353]">
                    {title} 데이터를 불러오지 못했습니다.
                </p>
            ) : query.data ? (
                <div
                    className={cn(
                        "rounded-[10px] border border-[#d3d3d3] bg-white px-4 py-5 text-[14px] leading-5 text-[#6b6c7b]",
                    )}
                >
                    {getReadyMessage(query.data)}
                </div>
            ) : null}
        </section>
    );
}
