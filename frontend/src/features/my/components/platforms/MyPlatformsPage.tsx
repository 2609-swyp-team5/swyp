"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/common/components/ui/Button";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useMyPlatformsQuery } from "@/features/my/hooks/queries/useMyPlatformsQuery";
import { useUpdatePlatformConnectionMutation } from "@/features/my/hooks/mutations/useUpdatePlatformConnectionMutation";
import { getPlatformDefinition } from "@/features/my/platformDefinitions";
import type { MyPlatformStatus } from "@/features/my/types";

import { MyPageContent } from "@/features/my/components/MyPageContent";

import {
    PlatformCard,
    type ConnectionStatus,
    type PlatformConnection,
} from "@/features/my/components/platforms/PlatformCard";
import { PlatformSummary } from "@/features/my/components/platforms/PlatformSummary";
import { PlatformDialog } from "@/features/my/components/platforms/PlatformDialog";

const connectionStatuses: Record<MyPlatformStatus, ConnectionStatus> = {
    CONNECTED: "connected",
    EXPIRED: "expired",
    DISCONNECTED: "disconnected",
};

export function MyPlatformsPage() {
    const { data, isPending, error, refetch } = useMyPlatformsQuery();
    const mutation = useUpdatePlatformConnectionMutation();
    const platforms: PlatformConnection[] = (data ?? []).map((item) => ({
        id: item.platform,
        ...getPlatformDefinition(item.platform, item.platformName),
        updated: item.updatedAt?.replace("T", " ").slice(0, 16) ?? "연동 이력 없음",
    }));
    const statuses: Record<string, ConnectionStatus> = Object.fromEntries(
        (data ?? []).map((item) => [item.platform, connectionStatuses[item.status]]),
    );
    const [selected, setSelected] = useState<PlatformConnection | null>(null);
    const [cookie, setCookie] = useState("");
    const [disconnecting, setDisconnecting] = useState(false);

    return (
        <MyPageContent
            eyebrow="연동 관리"
            title="플랫폼 별 연동 확인"
            eyebrowClassName="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#83889e]"
            titleClassName="text-[#363636]"
        >
            {isPending ? (
                <p role="status" className="text-[#83889e]">
                    연동 목록을 불러오는 중입니다.
                </p>
            ) : (
                data && <PlatformSummary statuses={statuses} />
            )}
            {error && (
                <div role="alert" className="text-destructive flex items-center gap-3 text-sm">
                    <p>{getApiErrorMessage(error)}</p>
                    <Button variant="outline" onClick={() => void refetch()}>
                        다시 시도
                    </Button>
                </div>
            )}
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
            <div className="grid gap-[10px] md:grid-cols-2 xl:grid-cols-3">
                {platforms.map((item) => (
                    <PlatformCard
                        key={`${item.id}:${statuses[item.id]}`}
                        item={item}
                        status={statuses[item.id]}
                        isPending={mutation.isPending}
                        onSelect={(value) => {
                            mutation.reset();
                            setDisconnecting(statuses[item.id] === "connected");
                            setCookie(value);
                            setSelected(item);
                        }}
                    />
                ))}
            </div>
            <PlatformDialog
                selected={selected}
                disconnecting={disconnecting}
                onOpenChange={(open) => {
                    if (!open && !mutation.isPending) {
                        setSelected(null);
                        setCookie("");
                    }
                }}
                isPending={mutation.isPending}
                errorMessage={mutation.error ? getApiErrorMessage(mutation.error) : null}
                onConfirm={() => {
                    if (!selected || mutation.isPending) return;
                    mutation.mutate(
                        disconnecting
                            ? { platform: selected.id, action: "disconnect" }
                            : { platform: selected.id, action: "connect", cookie },
                        {
                            onSuccess: () => {
                                setSelected(null);
                                setCookie("");
                            },
                        },
                    );
                }}
            />
        </MyPageContent>
    );
}
