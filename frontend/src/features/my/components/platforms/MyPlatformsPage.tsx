"use client";

import { useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";

import { MyPageContent } from "@/features/my/components/MyPageContent";

import {
    PlatformCard,
    type ConnectionStatus,
} from "@/features/my/components/platforms/PlatformCard";
import { PlatformSummary } from "@/features/my/components/platforms/PlatformSummary";
import { PlatformDialog } from "@/features/my/components/platforms/PlatformDialog";

const platforms = [
    {
        id: "bunjang",
        name: "번개장터",
        icon: "/my/platforms/bunjang.png",
        description: "중고거래 플랫폼",
        status: "expired",
        updated: "2시간 전",
    },
] as const;

export function MyPlatformsPage() {
    const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>(() =>
        Object.fromEntries(platforms.map((item) => [item.id, item.status])),
    );
    const [selected, setSelected] = useState<(typeof platforms)[number] | null>(null);
    const disconnecting = selected !== null && statuses[selected.id] === "connected";

    return (
        <MyPageContent
            eyebrow="연동 관리"
            title="플랫폼 별 연동 확인"
            eyebrowClassName="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#83889e]"
            titleClassName="text-[#363636]"
        >
            <PlatformSummary statuses={statuses} />
            <div className="flex items-start gap-3 rounded-xl border border-[#d3d3d3] bg-[#fafbff] px-5 py-4">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-[#363636]" aria-hidden="true" />
                <div>
                    <h2 className="text-[15px] leading-[22px] font-semibold tracking-[-0.5px] text-[#363636]">
                        연동하면 AI 시세 분석이 더 정확해져요
                    </h2>
                    <p className="text-[13px] leading-[19px] tracking-[-0.5px] text-[#83889e]">
                        판매 중인 물건의 상태를 자동으로 동기화하고 최적의 판매 타이밍을
                        알려드립니다.
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-[11px] py-[30px] text-[#545d82]">
                <div className="flex shrink-0 flex-col items-start gap-[5px]">
                    <Image src="/my/platforms/connection-bell.svg" alt="" width={29} height={29} />
                    <span className="text-base leading-[25px] text-[#d3d3d3]">
                        {Object.values(statuses).filter((status) => status !== "connected").length}
                        건
                    </span>
                </div>
                <h2 className="text-[20px] leading-[30px] font-semibold tracking-[0.5px]">
                    연결 알림을
                    <br />
                    확인해주세요
                </h2>
            </div>
            <div className="grid gap-[10px] md:grid-cols-2 xl:grid-cols-3">
                {platforms.map((item) => (
                    <PlatformCard
                        key={item.id}
                        item={item}
                        status={statuses[item.id]}
                        onSelect={() => setSelected(item)}
                    />
                ))}
            </div>
            <PlatformDialog
                selected={selected}
                disconnecting={disconnecting}
                onOpenChange={(open) => {
                    if (!open) setSelected(null);
                }}
                onConfirm={() => {
                    if (selected)
                        setStatuses((current) => ({
                            ...current,
                            [selected.id]: disconnecting ? "disconnected" : "connected",
                        }));
                }}
            />
        </MyPageContent>
    );
}
