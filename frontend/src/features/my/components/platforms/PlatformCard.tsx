"use client";

import Image from "next/image";
import { Button } from "@/common/components/ui/Button";
import { cn } from "@/common/lib/utils";
import { formatRelativeCreatedAt } from "@/features/search/utils/formatRelativeCreatedAt";
import type { MyPlatformType } from "@/features/my/types";

export type ConnectionStatus = "connected" | "expired" | "disconnected";
export type PlatformConnection = {
    id: MyPlatformType;
    name: string;
    icon: string;
    description: string;
    /** 마지막 연동 상태 변경 시각(백엔드 LocalDateTime), 이력이 없으면 null */
    updatedAt: string | null;
};

/** 요약 박스와 카드 상태 표시가 함께 쓰는 상태별 문구·색 */
export const statusItems: { status: ConnectionStatus; label: string; className: string }[] = [
    { status: "connected", label: "연결됨", className: "text-[#6653fb]" },
    { status: "expired", label: "만료됨", className: "text-[#272727]" },
    { status: "disconnected", label: "미연결", className: "text-[#fa503d]" },
];

/** 이름 끝 글자에 받침이 있으면 "이", 없으면 "가"(번개장터가, 당근마켓이). 한글이 아니면 "이". */
function subjectParticle(name: string) {
    const code = name.charCodeAt(name.length - 1) - 0xac00;
    if (code < 0 || code > 11171) return "이";
    return code % 28 === 0 ? "가" : "이";
}

function cardTexts(item: PlatformConnection, status: ConnectionStatus) {
    const lastConnected = item.updatedAt
        ? `마지막 연결 : ${formatRelativeCreatedAt(item.updatedAt)}`
        : null;
    if (status === "connected")
        return {
            title: `${item.name}${subjectParticle(item.name)} 연결되어 있어요.`,
            detail: lastConnected ?? "연결된 계정으로 상태를 동기화해요",
            guide: "판매 중인 물건의 상태를 동기화하고 있어요.",
            action: "연결 해제",
        };
    if (status === "expired")
        return {
            title: `${item.name}의 로그인이 만료됐어요.`,
            detail: lastConnected ?? "로그인이 만료되어 다시 연결이 필요해요",
            guide: "판매 상태 동기화를 위해 다시 연결해 주세요.",
            action: "다시 연결",
        };
    return {
        title: `${item.name}의 계정에 미연결됐어요.`,
        detail: "아직 연결된 계정이 없어요",
        guide: "판매 상태 동기화를 위해 연결해 주세요.",
        action: "연결",
    };
}

type PlatformCardProps = {
    item: PlatformConnection;
    status: ConnectionStatus;
    onSelect: () => void;
    isPending: boolean;
};

/** 플랫폼 연결 목록의 한 줄(Figma 1854-15649) */
export function PlatformCard({ item, status, onSelect, isPending }: PlatformCardProps) {
    const texts = cardTexts(item, status);
    const badge = statusItems.find((statusItem) => statusItem.status === status)!;

    return (
        <li className="flex flex-col rounded-[10px] border border-[#dedee6] bg-white px-5 pt-5 pb-[15px]">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-[10px]">
                    <Image
                        src={item.icon}
                        alt=""
                        width={37}
                        height={37}
                        className="mt-1 size-[37px] shrink-0 rounded-[8px] object-contain"
                    />
                    <div className="min-w-0">
                        <h3 className="typography-body-bold font-semibold break-keep text-[#6b6c7b]">
                            {texts.title}
                        </h3>
                        <p className="typography-body-small text-[#83889e]">{texts.detail}</p>
                    </div>
                </div>
                <p
                    className={cn(
                        "typography-body-bold-small flex shrink-0 items-center gap-[5px] font-semibold whitespace-nowrap",
                        badge.className,
                    )}
                >
                    <span aria-hidden="true" className="size-[6px] rounded-full bg-current" />
                    {badge.label}
                </p>
            </div>
            <div className="mt-[10px] flex flex-col items-end">
                <p className="typography-body-small text-right text-[#83889e]">{texts.guide}</p>
                <Button
                    type="button"
                    onClick={onSelect}
                    disabled={isPending}
                    aria-label={`${item.name} ${texts.action}`}
                    className="typography-body-small h-[30px] rounded-full bg-[#272727] px-[15px] py-[5px] font-semibold text-white hover:bg-[#464646] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 dark:hover:bg-[#464646]"
                >
                    {texts.action}
                </Button>
            </div>
        </li>
    );
}
