"use client";

import { Link2 } from "lucide-react";
import { cn } from "@/common/lib/utils";
import type { ConnectionStatus } from "@/features/my/components/platforms/PlatformCard";

const statusItems: { status: ConnectionStatus; label: string; className: string }[] = [
    { status: "connected", label: "연결됨", className: "text-[#6653fb]" },
    { status: "expired", label: "만료됨", className: "text-[#363636]" },
    { status: "disconnected", label: "미연결", className: "text-[#fa503d]" },
];

export function PlatformSummary({ statuses }: { statuses: Record<string, ConnectionStatus> }) {
    return (
        <div className="flex flex-col overflow-hidden rounded-[10px] border border-[#d3d3d3] bg-white md:flex-row">
            <div className="flex flex-col gap-[10px] bg-[#fafbff] px-5 py-5 md:w-[220px] md:shrink-0 md:justify-center">
                <Link2 className="size-5 -rotate-45 text-[#6653fb]" aria-hidden="true" />
                <h2 className="text-[16px] leading-[24px] font-semibold tracking-[-0.5px] text-[#6653fb] md:text-[18px] md:leading-[27px]">
                    연동하면 AI 시세 분석이
                    <br />더 정확해져요
                </h2>
            </div>
            <div className="grid flex-1 grid-cols-3 divide-x divide-[#d3d3d3] border-t border-[#d3d3d3] md:border-t-0 md:border-l">
                {statusItems.map(({ status, label, className }) => (
                    <div
                        key={status}
                        className={cn(
                            "flex min-h-[96px] flex-col items-center justify-center gap-[6px] px-2 py-4",
                            className,
                        )}
                    >
                        <p className="text-[24px] leading-[32px] font-semibold tracking-[0.5px]">
                            {Object.values(statuses).filter((value) => value === status).length}
                        </p>
                        <p className="text-[13px] leading-[19px] font-semibold tracking-[-0.5px]">
                            {label}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
