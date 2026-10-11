"use client";

import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { Button } from "@/common/components/ui/Button";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useMyPlatformsQuery } from "@/features/my/hooks/queries/useMyPlatformsQuery";
import { useUpdatePlatformConnectionMutation } from "@/features/my/hooks/mutations/useUpdatePlatformConnectionMutation";
import { useBunjangVerificationMutation } from "@/features/my/hooks/mutations/useBunjangVerificationMutation";
import { getPlatformDefinition } from "@/features/my/platformDefinitions";
import type {
    BunjangVerificationRequest,
    BunjangVerificationResponse,
    MyPlatformStatus,
} from "@/features/my/types";

import { MyPageContent } from "@/features/my/components/MyPageContent";

import {
    PlatformCard,
    type ConnectionStatus,
    type PlatformConnection,
} from "@/features/my/components/platforms/PlatformCard";
import { PlatformSummary } from "@/features/my/components/platforms/PlatformSummary";
import { PlatformDialog } from "@/features/my/components/platforms/PlatformDialog";
import { BunjangVerificationDialog } from "@/features/my/components/platforms/BunjangVerificationDialog";

const connectionStatuses: Record<MyPlatformStatus, ConnectionStatus> = {
    CONNECTED: "connected",
    EXPIRED: "expired",
    DISCONNECTED: "disconnected",
};

export function MyPlatformsPage() {
    const { data, isPending, error, refetch } = useMyPlatformsQuery();
    const disconnectMutation = useUpdatePlatformConnectionMutation();
    const verificationMutation = useBunjangVerificationMutation();
    const platforms: PlatformConnection[] = (data ?? []).map((item) => ({
        id: item.platform,
        ...getPlatformDefinition(item.platform, item.platformName),
        updated: item.updatedAt?.replace("T", " ").slice(0, 16) ?? "연동 이력 없음",
    }));
    const statuses: Record<string, ConnectionStatus> = Object.fromEntries(
        (data ?? []).map((item) => [item.platform, connectionStatuses[item.status]]),
    );
    const [selected, setSelected] = useState<PlatformConnection | null>(null);
    const [verificationTarget, setVerificationTarget] = useState<PlatformConnection | null>(null);
    const [verification, setVerification] = useState<BunjangVerificationResponse | null>(null);
    const [verificationVersion, setVerificationVersion] = useState(0);
    const isMutationPending =
        disconnectMutation.isPending ||
        verificationMutation.request.isPending ||
        verificationMutation.confirm.isPending;

    const resetVerification = () => {
        setVerificationTarget(null);
        setVerification(null);
        verificationMutation.request.reset();
        verificationMutation.confirm.reset();
    };

    return (
        <MyPageContent
            eyebrow="연동 관리"
            title="플랫폼 별 연동 확인"
            eyebrowClassName="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#83889e]"
            titleClassName="text-[#363636]"
        >
            <section className="mb-5 rounded-r-[10px] border-l-[3px] border-[#6653fb] bg-[#fafbff] px-5 py-4">
                <h2 className="flex items-center gap-[6px] text-[14px] leading-[21px] font-semibold tracking-[-0.5px] text-[#464646]">
                    <CircleAlert
                        className="size-4 shrink-0 fill-[#464646] text-[#fafbff]"
                        aria-hidden="true"
                    />
                    플랫폼 연동 안내
                </h2>
                <ul className="mt-[6px] list-disc pl-5 text-[12px] leading-[20px] tracking-[-0.5px] text-[#464646]">
                    <li>연결이 만료되면 일부 연동 기능이 제한될 수 있어요</li>
                    <li>지금이니?에서 연결을 해제해도 외부 플랫폼의 판매글은 삭제되지 않아요</li>
                </ul>
            </section>
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
            <div className="mt-[30px] grid gap-[10px] md:grid-cols-2 xl:grid-cols-3">
                {platforms.map((item) => (
                    <PlatformCard
                        key={`${item.id}:${statuses[item.id]}`}
                        item={item}
                        status={statuses[item.id]}
                        isPending={isMutationPending}
                        onSelect={() => {
                            if (statuses[item.id] === "connected") {
                                disconnectMutation.reset();
                                setSelected(item);
                                return;
                            }
                            verificationMutation.request.reset();
                            verificationMutation.confirm.reset();
                            setVerification(null);
                            setVerificationTarget(item);
                        }}
                    />
                ))}
            </div>
            <PlatformDialog
                selected={selected}
                onOpenChange={(open) => {
                    if (!open && !disconnectMutation.isPending) {
                        setSelected(null);
                    }
                }}
                isPending={disconnectMutation.isPending}
                errorMessage={
                    disconnectMutation.error ? getApiErrorMessage(disconnectMutation.error) : null
                }
                onConfirm={() => {
                    if (!selected || disconnectMutation.isPending) return;
                    disconnectMutation.mutate(
                        { platform: selected.id, action: "disconnect" },
                        { onSuccess: () => setSelected(null) },
                    );
                }}
            />
            <BunjangVerificationDialog
                key={verificationTarget?.id ?? "closed"}
                selected={verificationTarget}
                verification={verification}
                verificationVersion={verificationVersion}
                isRequestPending={verificationMutation.request.isPending}
                isConfirmPending={verificationMutation.confirm.isPending}
                errorMessage={
                    verificationMutation.confirm.error
                        ? getApiErrorMessage(verificationMutation.confirm.error)
                        : verificationMutation.request.error
                          ? getApiErrorMessage(verificationMutation.request.error)
                          : null
                }
                onOpenChange={(open) => {
                    if (!open && !isMutationPending) resetVerification();
                }}
                onRequest={(request: BunjangVerificationRequest) => {
                    if (!verificationTarget || isMutationPending) return;
                    verificationMutation.confirm.reset();
                    verificationMutation.request.mutate(
                        {
                            platform: verificationTarget.id,
                            request,
                        },
                        {
                            onSuccess: (nextVerification) => {
                                setVerification(nextVerification);
                                setVerificationVersion((current) => current + 1);
                            },
                        },
                    );
                }}
                onConfirm={(otp, verificationId) => {
                    if (!verificationTarget || isMutationPending) return;
                    verificationMutation.confirm.mutate(
                        {
                            platform: verificationTarget.id,
                            verificationId,
                            otp,
                        },
                        { onSuccess: resetVerification },
                    );
                }}
            />
        </MyPageContent>
    );
}
