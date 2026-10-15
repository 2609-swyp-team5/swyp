"use client";

import { useState } from "react";
import Image from "next/image";
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
        updatedAt: item.updatedAt ?? null,
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
            eyebrowClassName="typography-heading-03 font-semibold text-[#83889e]"
            titleClassName="text-[#363636]"
        >
            <section className="mb-5 border-l-3 border-[#6653fb] bg-[#fafbff] px-5 py-[15px]">
                <h2 className="typography-body-bold-small flex items-center gap-[5px] font-semibold text-[#6b6c7b]">
                    <Image src="/figma/platforms/info.svg" alt="" width={15} height={15} />
                    플랫폼 연동 안내
                </h2>
                <ul className="typography-body-small mt-[5px] list-disc ps-[18px] text-[#6b6c7b]">
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
                <div
                    role="alert"
                    className="text-destructive typography-body-small flex items-center gap-3"
                >
                    <p>{getApiErrorMessage(error)}</p>
                    <Button variant="outline" onClick={() => void refetch()}>
                        다시 시도
                    </Button>
                </div>
            )}
            {data && (
                <section className="mt-10 flex flex-col gap-[15px]">
                    <h2 className="flex items-center gap-[10px]">
                        <span className="typography-heading-bold font-semibold text-[#545d82]">
                            플랫폼 연결
                        </span>
                        <span className="typography-body-medium text-[#b1a9ef]">
                            {platforms.length}건
                        </span>
                    </h2>
                    <ul className="flex flex-col gap-[10px]">
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
                    </ul>
                </section>
            )}
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
