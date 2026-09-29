"use client";

import { useState } from "react";
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
        icon: "/my/home/bunjang.svg",
        description: "중고거래 플랫폼",
        status: "expired",
        updated: "2시간 전",
    },
    {
        id: "carrot",
        name: "당근마켓",
        icon: "/my/home/daangn.svg",
        description: "동네 직거래 플랫폼",
        status: "connected",
        updated: "2026.09.01 연결",
    },
    {
        id: "joongna",
        name: "중고나라",
        icon: "/my/home/joonggonara.png",
        description: "대한민국 최대 중고마켓",
        status: "expired",
        updated: "2시간 전",
    },
    {
        id: "fruits",
        name: "후르츠패밀리",
        icon: null,
        description: "명품·프리미엄 중고거래",
        status: "disconnected",
        updated: "",
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
            titleClassName="text-[32px] leading-[42px] tracking-[0.5px] text-[#363636] sm:text-[40px] sm:leading-[50px] xl:text-[53px] xl:leading-[75px]"
        >
            <PlatformSummary statuses={statuses} />
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#d3d3d3] bg-[#fafbff] px-5 py-4">
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
