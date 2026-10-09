"use client";

import Image from "next/image";
import { Button } from "@/common/components/ui/Button";
import type { MyPlatformType } from "@/features/my/types";

export type ConnectionStatus = "connected" | "expired" | "disconnected";
export type PlatformConnection = {
    id: MyPlatformType;
    name: string;
    icon: string;
    description: string;
    updated: string;
};

/** 이름 끝 글자에 받침이 있으면 "이", 없으면 "가"(번개장터가, 당근마켓이). 한글이 아니면 "이". */
function subjectParticle(name: string) {
    const code = name.charCodeAt(name.length - 1) - 0xac00;
    if (code < 0 || code > 11171) return "이";
    return code % 28 === 0 ? "가" : "이";
}

type PlatformCardProps = {
    item: PlatformConnection;
    status: ConnectionStatus;
    onSelect: () => void;
    isPending: boolean;
};

export function PlatformCard({ item, status, onSelect, isPending }: PlatformCardProps) {
    return (
        <div className="flex min-h-[154px] flex-col rounded-[10px] border border-[#dedee6] bg-white px-5 pt-5 pb-[15px]">
            <div className="flex items-center gap-[10px]">
                <Image
                    src={item.icon}
                    alt=""
                    width={37}
                    height={37}
                    className="size-[37px] shrink-0 rounded-[8px] object-contain"
                />
                <div className="min-w-0 tracking-[-0.5px]">
                    <h3 className="text-[13px] leading-[20px] font-semibold text-[#6b6c7b]">
                        {status === "expired"
                            ? `${item.name}의 로그인이 만료됐어요.`
                            : status === "connected"
                              ? `${item.name}${subjectParticle(item.name)} 연결되어 있어요.`
                              : `${item.name}${subjectParticle(item.name)} 연결되지 않았어요.`}
                    </h3>
                    <p className="text-[10px] leading-[15px] text-[#83889e]">{item.updated}</p>
                </div>
            </div>
            <p className="mt-[10px] text-[10px] leading-[15px] tracking-[-0.5px] text-[#83889e]">
                {status === "expired" ? (
                    <>
                        판매 상태 동기화를 위해
                        <br />
                        다시 연결해 주세요.
                    </>
                ) : status === "connected" ? (
                    <>
                        판매 중인 물건의 상태를
                        <br />
                        동기화하고 있어요.
                    </>
                ) : (
                    <>
                        {item.description}
                        <br />
                        연결하고 상태를 동기화해 주세요.
                    </>
                )}
            </p>
            <Button
                variant="outline"
                type="button"
                onClick={onSelect}
                disabled={isPending}
                aria-label={
                    item.name +
                    (status === "connected"
                        ? " 연결 해제"
                        : status === "expired"
                          ? " 다시 연결"
                          : " 연결")
                }
                className="mt-[10px] ml-auto h-[19px] rounded-full border-[#6b6c7b] px-[10px] text-[10px] leading-[15px] tracking-[-0.5px] text-[#6b6c7b] hover:border-[#6653fb] hover:bg-[#fafbff] hover:text-[#6653fb] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 dark:hover:bg-[#fafbff]"
            >
                {status === "connected" ? "연결 해제" : status === "expired" ? "다시 연결" : "연결"}
            </Button>
        </div>
    );
}
