"use client";

import { useMemo, useState, type ReactElement } from "react";

import Image from "next/image";
import { CheckCircle2, CircleAlert, CircleX, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/common/components/ui/Button";
import { Checkbox } from "@/common/components/ui/Checkbox";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/common/components/ui/Dialog";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { getPlatformDefinition } from "@/features/my/platformDefinitions";
import type { MyPlatformConnection, MyPlatformType } from "@/features/my/types";
import { useMyPlatformsQuery } from "@/features/my/hooks/queries/useMyPlatformsQuery";
import { usePublishProductMutation } from "@/features/sell/hooks/mutations/usePublishProductMutation";
import type { ProductPlatform } from "@/features/sell/types";

type PublishResult = {
    platform: MyPlatformType;
    success: boolean;
    productUrl?: string | null;
    message?: string;
};

type PlatformPublishDialogProps = {
    productId: number;
    existingPlatforms: ProductPlatform[];
    children: ReactElement;
};

const connectedStatuses = new Set<MyPlatformConnection["status"]>(["CONNECTED"]);

function formatLastCheckedAt(updatedAt: string | null) {
    if (!updatedAt) return "연동 이력 없음";

    return `마지막 확인: ${updatedAt.replace("T", " ").slice(0, 16)}`;
}

function resultTitle(results: PublishResult[]) {
    if (results.every((result) => !result.success)) return "플랫폼 등록에 실패했어요";
    if (results.some((result) => !result.success)) return "일부 플랫폼에 등록됐어요";
    return "플랫폼에 등록됐어요";
}

export function PlatformPublishDialog({
    productId,
    existingPlatforms,
    children,
}: PlatformPublishDialogProps) {
    const router = useRouter();
    const platformsQuery = useMyPlatformsQuery();
    const publishMutation = usePublishProductMutation();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedPlatforms, setSelectedPlatforms] = useState<MyPlatformType[]>([]);
    const [results, setResults] = useState<PublishResult[]>([]);
    const [isResultView, setIsResultView] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    const platforms = useMemo(() => platformsQuery.data ?? [], [platformsQuery.data]);
    const failedPlatforms = results
        .filter((result) => !result.success)
        .map((result) => result.platform);

    const resetDialog = () => {
        setSelectedPlatforms([]);
        setResults([]);
        setIsResultView(false);
        setIsPublishing(false);
    };

    const handleOpenChange = (open: boolean) => {
        if (isPublishing) return;
        setIsOpen(open);
        if (!open) resetDialog();
    };

    const togglePlatform = (platform: MyPlatformConnection) => {
        if (!connectedStatuses.has(platform.status) || isPublishing) return;

        setSelectedPlatforms((current) =>
            current.includes(platform.platform)
                ? current.filter((item) => item !== platform.platform)
                : [...current, platform.platform],
        );
    };

    const publish = async (platformsToPublish: MyPlatformType[]) => {
        if (platformsToPublish.length === 0 || isPublishing) return;

        setIsPublishing(true);
        const settled = await Promise.allSettled(
            platformsToPublish.map((platform) =>
                publishMutation.mutateAsync({ productId, platform }),
            ),
        );
        setResults(
            settled.map((result, index) => {
                const platform = platformsToPublish[index];
                if (result.status === "fulfilled") {
                    return { platform, success: true, productUrl: result.value.productUrl };
                }

                return { platform, success: false, message: getApiErrorMessage(result.reason) };
            }),
        );
        setIsResultView(true);
        setIsPublishing(false);
    };

    const handlePublish = () => void publish(selectedPlatforms);
    const handleRetry = () => {
        setIsResultView(false);
        setSelectedPlatforms(failedPlatforms);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent
                aria-describedby="platform-publish-description"
                className="max-w-[600px] gap-5 rounded-[16px] border-[#dee5ed] p-6 sm:p-6"
            >
                <DialogClose
                    aria-label="플랫폼 게시 팝업 닫기"
                    className="absolute top-5 right-5 rounded-md p-1 text-[#83889e] transition-colors hover:bg-[#f5f3ff] hover:text-[#6653fb]"
                    disabled={isPublishing}
                >
                    <X aria-hidden="true" className="size-5" />
                </DialogClose>

                {isResultView ? (
                    <>
                        <div className="space-y-1 pr-8">
                            <DialogTitle className="text-[24px] leading-9 font-bold text-[#363636]">
                                {resultTitle(results)}
                            </DialogTitle>
                            <DialogDescription
                                id="platform-publish-description"
                                className="text-[13px] leading-5 text-[#83889e]"
                            >
                                등록 결과를 확인하고, 실패한 플랫폼은 다시 시도해 보세요.
                            </DialogDescription>
                        </div>
                        <div className="rounded-[10px] border border-[#eef0f5] px-4">
                            {results.map((result) => {
                                const definition = getPlatformDefinition(result.platform);

                                return (
                                    <div
                                        key={result.platform}
                                        className="flex min-h-[68px] items-center gap-3 border-b border-[#eef0f5] last:border-b-0"
                                    >
                                        <Image
                                            src={definition.icon}
                                            alt=""
                                            width={32}
                                            height={32}
                                            className="size-8 shrink-0 rounded-[8px] object-contain"
                                        />
                                        <span className="min-w-0 flex-1 text-[14px] leading-5 font-semibold text-[#6b6c7b]">
                                            {definition.name}
                                        </span>
                                        <span
                                            className={`flex items-center gap-1 text-[12px] leading-5 font-semibold ${result.success ? "text-[#6653fb]" : "text-[#fa503d]"}`}
                                        >
                                            {result.success ? (
                                                <CheckCircle2
                                                    aria-hidden="true"
                                                    className="size-4"
                                                />
                                            ) : (
                                                <CircleX aria-hidden="true" className="size-4" />
                                            )}
                                            {result.success ? "등록완료" : "등록실패"}
                                        </span>
                                        {result.success && result.productUrl ? (
                                            <a
                                                href={result.productUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={`${definition.name} 상품 페이지 바로가기`}
                                                className="rounded-full bg-[#272727] px-3 py-1 text-[11px] leading-4 font-semibold text-white transition-opacity hover:opacity-80"
                                            >
                                                바로가기
                                            </a>
                                        ) : (
                                            <span className="rounded-full bg-[#272727] px-3 py-1 text-[11px] leading-4 font-semibold text-white">
                                                {result.success ? "연결됨" : "다시 시도"}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                            {results.some((result) => !result.success) ? (
                                <div className="my-4 flex items-start gap-2 rounded-[8px] border border-[#fa9b91] bg-[#fff8f7] px-3 py-2.5 text-[11px] leading-4 text-[#6b6c7b]">
                                    <CircleAlert
                                        aria-hidden="true"
                                        className="mt-0.5 size-4 shrink-0 text-[#fa503d]"
                                    />
                                    <span>
                                        {results.find((result) => !result.success)?.message ??
                                            "플랫폼 등록에 실패했습니다."}
                                    </span>
                                </div>
                            ) : null}
                        </div>
                        {failedPlatforms.length > 0 ? (
                            <Button
                                type="button"
                                className="h-11 rounded-[8px] bg-[#6653fb] text-[14px] font-semibold hover:bg-[#5745e7]"
                                onClick={handleRetry}
                            >
                                실패한 플랫폼 다시 시도
                            </Button>
                        ) : null}
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 rounded-[8px] border-transparent bg-[#f1f1f1] text-[14px] font-semibold text-[#6b6c7b] hover:bg-[#e8e8ed]"
                            >
                                닫기
                            </Button>
                        </DialogClose>
                    </>
                ) : (
                    <>
                        <div className="space-y-1 pr-8">
                            <DialogTitle className="text-[24px] leading-9 font-bold text-[#363636]">
                                게시할 플랫폼을 선택해주세요
                            </DialogTitle>
                            <DialogDescription
                                id="platform-publish-description"
                                className="text-[13px] leading-5 text-[#fa503d]"
                            >
                                연결된 플랫폼을 선택하면 판매글을 바로 등록할 수 있어요.
                            </DialogDescription>
                        </div>
                        <div className="rounded-[10px] border border-[#eef0f5] px-4">
                            {platformsQuery.isPending ? (
                                <p
                                    role="status"
                                    className="py-8 text-center text-[13px] text-[#83889e]"
                                >
                                    연동된 플랫폼을 불러오는 중입니다.
                                </p>
                            ) : platformsQuery.error ? (
                                <div className="flex items-center justify-between gap-3 py-5 text-[13px] text-[#d65353]">
                                    <p>{getApiErrorMessage(platformsQuery.error)}</p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-8 shrink-0 rounded-full text-xs"
                                        onClick={() => void platformsQuery.refetch()}
                                    >
                                        다시 시도
                                    </Button>
                                </div>
                            ) : platforms.length === 0 ? (
                                <p className="py-8 text-center text-[13px] text-[#83889e]">
                                    연동 가능한 플랫폼이 없습니다.
                                </p>
                            ) : (
                                platforms.map((platform) => {
                                    const definition = getPlatformDefinition(
                                        platform.platform,
                                        platform.platformName,
                                    );
                                    const isConnected = connectedStatuses.has(platform.status);
                                    const postedPlatform = existingPlatforms.find(
                                        (item) =>
                                            item.platform === platform.platform &&
                                            item.status === "POSTED",
                                    );
                                    const postedProductUrl = postedPlatform?.productUrl;
                                    const isAlreadyPosted = Boolean(postedPlatform);
                                    const isSelected = selectedPlatforms.includes(
                                        platform.platform,
                                    );

                                    return (
                                        <div
                                            key={platform.platform}
                                            className="flex min-h-[68px] items-center gap-3 border-b border-[#eef0f5] last:border-b-0"
                                        >
                                            {isAlreadyPosted ? (
                                                <span
                                                    aria-hidden="true"
                                                    className="size-4 shrink-0"
                                                />
                                            ) : (
                                                <Checkbox
                                                    checked={isSelected}
                                                    disabled={!isConnected || isPublishing}
                                                    aria-label={`${definition.name} 게시 선택`}
                                                    className="size-4 rounded-[3px] border-[#d3d3d3] data-[state=checked]:border-[#6653fb] data-[state=checked]:bg-[#6653fb]"
                                                    onCheckedChange={() => togglePlatform(platform)}
                                                />
                                            )}
                                            <Image
                                                src={definition.icon}
                                                alt=""
                                                width={32}
                                                height={32}
                                                className={`size-8 shrink-0 rounded-[8px] object-contain ${isConnected ? "" : "opacity-60 grayscale"}`}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[14px] leading-5 font-semibold text-[#6b6c7b]">
                                                    {definition.name}
                                                </p>
                                                <p className="text-[10px] leading-4 text-[#83889e]">
                                                    {formatLastCheckedAt(platform.updatedAt)}
                                                </p>
                                            </div>
                                            {isAlreadyPosted ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="flex items-center gap-1 text-[12px] leading-5 font-semibold text-[#6653fb]">
                                                        <CheckCircle2
                                                            aria-hidden="true"
                                                            className="size-4"
                                                        />
                                                        등록완료
                                                    </span>
                                                    {postedProductUrl ? (
                                                        <a
                                                            href={postedProductUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            aria-label={`${definition.name} 상품 페이지 바로가기`}
                                                            className="rounded-full bg-[#272727] px-3 py-1 text-[11px] leading-4 font-semibold text-white transition-opacity hover:opacity-80"
                                                        >
                                                            바로가기
                                                        </a>
                                                    ) : null}
                                                </div>
                                            ) : isConnected ? (
                                                <span className="rounded-full bg-[#272727] px-3 py-1 text-[11px] leading-4 font-semibold text-white">
                                                    연결됨
                                                </span>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="h-7 rounded-full border-[#9aa0b0] px-3 text-[11px] text-[#83889e] hover:border-[#6653fb] hover:bg-[#f5f3ff] hover:text-[#6653fb]"
                                                    onClick={() => {
                                                        setIsOpen(false);
                                                        resetDialog();
                                                        router.push("/my/platforms");
                                                    }}
                                                >
                                                    연동하기
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <Button
                            type="button"
                            disabled={
                                selectedPlatforms.length === 0 ||
                                isPublishing ||
                                platformsQuery.isPending
                            }
                            className="h-11 rounded-[8px] bg-[#6653fb] text-[14px] font-semibold hover:bg-[#5745e7]"
                            onClick={handlePublish}
                        >
                            {isPublishing ? "플랫폼에 등록 중..." : "선택한 플랫폼에 게시하기"}
                        </Button>
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isPublishing}
                                className="h-11 rounded-[8px] border-transparent bg-[#f1f1f1] text-[14px] font-semibold text-[#6b6c7b] hover:bg-[#e8e8ed]"
                            >
                                취소
                            </Button>
                        </DialogClose>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
