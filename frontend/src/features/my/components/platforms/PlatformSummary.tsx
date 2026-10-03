"use client";

import type { ConnectionStatus } from "@/features/my/components/platforms/PlatformCard";

const statusLabels: Record<ConnectionStatus, string> = {
    connected: "연결됨",
    expired: "만료됨",
    disconnected: "미연결",
};

export function PlatformSummary({ statuses }: { statuses: Record<string, ConnectionStatus> }) {
    return (
        <div className="mb-[30px] grid grid-cols-3 gap-3">
            {(Object.keys(statusLabels) as ConnectionStatus[]).map((status) => (
                <div
                    key={status}
                    className="flex min-h-[84px] flex-col justify-end rounded-[10px] border border-[#d3d3d3] bg-white px-5 py-[10px] text-[#6b6c7b]"
                >
                    <p className="text-[32px] leading-[42px] font-bold tracking-[0.5px]">
                        {Object.values(statuses).filter((value) => value === status).length}
                    </p>
                    <p className="text-[15px] leading-[22px] font-semibold tracking-[-0.5px]">
                        {statusLabels[status]}
                    </p>
                </div>
            ))}
        </div>
    );
}
