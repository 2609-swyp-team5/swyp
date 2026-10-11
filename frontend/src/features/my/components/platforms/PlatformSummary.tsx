"use client";

import Image from "next/image";
import { cn } from "@/common/lib/utils";
import {
    statusItems,
    type ConnectionStatus,
} from "@/features/my/components/platforms/PlatformCard";

/** 연동 상태별 개수 요약(Figma 1959-13611) */
export function PlatformSummary({ statuses }: { statuses: Record<string, ConnectionStatus> }) {
    return (
        <section
            aria-label="연동 상태 요약"
            className="flex flex-col overflow-hidden rounded-[5px] border border-[#d3d3d3] bg-white md:flex-row"
        >
            <div className="flex flex-1 flex-col justify-center gap-[5px] bg-[#fafbff] p-5">
                <Image src="/figma/platforms/link.svg" alt="" width={22} height={22} />
                <h2 className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#6653fb]">
                    연동하면 AI 시세 분석이
                    <br />더 정확해져요
                </h2>
            </div>
            <div className="grid grid-cols-3 divide-x divide-[#d3d3d3] border-t border-[#d3d3d3] md:w-[468px] md:shrink-0 md:border-t-0 md:border-l">
                {statusItems.map(({ status, label, className }) => (
                    <div
                        key={status}
                        className={cn(
                            "flex min-h-[96px] flex-col items-center justify-center py-[10px] md:h-[119px]",
                            className,
                        )}
                    >
                        <p className="text-[25px] leading-[40px] font-medium tracking-[0.5px]">
                            {Object.values(statuses).filter((value) => value === status).length}
                        </p>
                        <p className="text-[13px] leading-[20px] font-semibold tracking-[-0.5px]">
                            {label}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
