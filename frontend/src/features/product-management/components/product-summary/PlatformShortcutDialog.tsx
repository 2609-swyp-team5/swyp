"use client";

import { useState } from "react";

import Image from "next/image";
import { ArrowUpRight, ExternalLink, Globe2, X } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { cn } from "@/common/lib/utils";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/common/components/ui/Dialog";
import type { ProductPlatform } from "@/features/sell/types";

type ProductPlatformShortcut = Pick<
    ProductPlatform,
    "platform" | "platformName" | "status" | "productUrl"
>;

const platformStatusLabels: Record<ProductPlatform["status"], string> = {
    POSTING: "등록 중",
    POSTED: "게시됨",
    FAILED: "등록 실패",
    REMOVED: "내려감",
};

const platformIconPaths: Record<string, string> = {
    BUNJANG: "/my/platforms/bunjang.png",
    번개장터: "/my/platforms/bunjang.png",
    DAANGN: "/my/home/daangn.svg",
    당근마켓: "/my/home/daangn.svg",
    JOONGGONARA: "/my/home/joonggonara.png",
    중고나라: "/my/home/joonggonara.png",
};

export function PlatformShortcutDialog({
    product,
    className,
    label = "바로가기",
    compact = false,
}: {
    product: { platforms: ProductPlatformShortcut[] };
    className?: string;
    label?: string;
    compact?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const platforms = product.platforms;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                        compact
                            ? "h-auto gap-1.5 rounded-[10px] border border-[#d3d3d3] bg-white text-[13px] text-[#6653fb] hover:border-[#6653fb] hover:bg-[#fafbff]"
                            : "h-auto flex-col gap-2 rounded-xl p-2.5 text-[#83889e] hover:bg-[#f5f3ff] hover:text-[#6653fb]",
                        className,
                    )}
                >
                    <span
                        className={cn(
                            "flex items-center justify-center",
                            compact ? "size-5" : "size-10 rounded-full bg-[#eaeafd]",
                        )}
                    >
                        <ExternalLink
                            aria-hidden="true"
                            className={cn(
                                "text-[#6653fb]",
                                compact ? "size-[18px]" : "size-[22px]",
                            )}
                        />
                    </span>
                    <span
                        className={cn(
                            "leading-[25px] font-normal",
                            compact ? "text-[13px]" : "text-[16px]",
                        )}
                    >
                        {label}
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm gap-5 rounded-[16px] border-[#dee5ed] p-6">
                <DialogClose
                    aria-label="플랫폼 선택 닫기"
                    className="absolute top-4 right-4 rounded-md p-1 text-[#83889e] transition-colors hover:bg-[#f5f3ff] hover:text-[#6653fb]"
                >
                    <X aria-hidden="true" className="size-4" />
                </DialogClose>
                <div className="space-y-1 pr-6">
                    <DialogTitle className="text-[18px] leading-7 font-bold text-[#363636]">
                        상품 바로가기
                    </DialogTitle>
                    <DialogDescription className="text-[13px] leading-5 text-[#83889e]">
                        이동할 플랫폼을 선택해 주세요.
                    </DialogDescription>
                </div>

                {platforms.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        {platforms.map((platform) => {
                            const canOpen =
                                platform.status === "POSTED" && Boolean(platform.productUrl);
                            const platformLabel = platform.platformName || platform.platform;
                            const platformIcon =
                                platformIconPaths[platform.platform] ??
                                platformIconPaths[platform.platformName];
                            const itemClassName =
                                "flex items-center justify-between rounded-[10px] border px-3 py-2.5 text-left transition-colors";

                            if (!canOpen) {
                                return (
                                    <div
                                        key={`${platform.platform}-${platform.productUrl ?? "unknown"}`}
                                        aria-disabled="true"
                                        className={`${itemClassName} cursor-not-allowed border-[#eef0f5] bg-[#fafbfc] text-[#9aa0b0]`}
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            {platformIcon ? (
                                                <Image
                                                    src={platformIcon}
                                                    alt=""
                                                    width={32}
                                                    height={32}
                                                    className="size-8 shrink-0 rounded-[8px] object-contain grayscale"
                                                />
                                            ) : (
                                                <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#eef0f5] text-[#9aa0b0]">
                                                    <Globe2 aria-hidden="true" className="size-4" />
                                                </span>
                                            )}
                                            <span className="truncate text-[14px] leading-5 font-semibold">
                                                {platformLabel}
                                            </span>
                                        </div>
                                        <span className="text-[12px] leading-5">
                                            {platformStatusLabels[platform.status]}
                                        </span>
                                    </div>
                                );
                            }

                            return (
                                <DialogClose key={platform.productUrl} asChild>
                                    <a
                                        href={platform.productUrl ?? undefined}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`${itemClassName} border-[#dedee6] text-[#363636] hover:border-[#6653fb] hover:bg-[#f8f7ff]`}
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            {platformIcon ? (
                                                <Image
                                                    src={platformIcon}
                                                    alt=""
                                                    width={32}
                                                    height={32}
                                                    className="size-8 shrink-0 rounded-[8px] object-contain"
                                                />
                                            ) : (
                                                <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#f5f3ff] text-[#6653fb]">
                                                    <Globe2 aria-hidden="true" className="size-4" />
                                                </span>
                                            )}
                                            <span className="truncate text-[14px] leading-5 font-semibold">
                                                {platformLabel}
                                            </span>
                                        </div>
                                        <span className="flex items-center gap-1 text-[12px] leading-5 font-medium text-[#6653fb]">
                                            바로가기
                                            <ArrowUpRight aria-hidden="true" className="size-3.5" />
                                        </span>
                                    </a>
                                </DialogClose>
                            );
                        })}
                    </div>
                ) : (
                    <p className="rounded-[10px] bg-[#fafbfc] px-4 py-6 text-center text-[13px] leading-5 text-[#83889e]">
                        연동된 플랫폼이 없습니다.
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
}
