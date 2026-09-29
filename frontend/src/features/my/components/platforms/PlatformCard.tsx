"use client";

import Image from "next/image";
import { Grape } from "lucide-react";
import { Button } from "@/common/components/ui/Button";

export type ConnectionStatus = "connected" | "expired" | "disconnected";
export type PlatformConnection = {
    id: string;
    name: string;
    icon: string | null;
    description: string;
    updated: string;
};
type PlatformCardProps = {
    item: PlatformConnection;
    status: ConnectionStatus;
    onSelect: () => void;
};

export function PlatformCard({ item, status, onSelect }: PlatformCardProps) {
    return (
        <div className="flex min-h-[154px] flex-col rounded-[10px] border border-[#dedee6] bg-white px-5 pt-5 pb-[15px]">
            <div className="flex items-center gap-[10px]">
                {item.icon ? (
                    <Image
                        src={item.icon}
                        alt=""
                        width={37}
                        height={37}
                        className="size-[37px] shrink-0 rounded-[8px] object-contain"
                    />
                ) : (
                    <span
                        aria-hidden="true"
                        className="flex size-[37px] shrink-0 items-center justify-center rounded-[8px] bg-[#fafbff] text-[#6653fb]"
                    >
                        <Grape className="size-5" />
                    </span>
                )}
                <div className="min-w-0 tracking-[-0.5px]">
                    <h2 className="text-[15px] leading-[22px] font-semibold text-[#6b6c7b]">
                        {status === "expired"
                            ? `${item.name}의 로그인이 만료됐어요.`
                            : status === "connected"
                              ? `${item.name}이 연결되어 있어요.`
                              : `${item.name}이 연결되지 않았어요.`}
                    </h2>
                    <p className="text-[12px] leading-[18px] text-[#83889e]">{item.updated}</p>
                </div>
            </div>
            <p className="mt-[10px] text-[13px] leading-[19px] tracking-[-0.5px] text-[#83889e]">
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
                onClick={onSelect}
                aria-label={item.name + (status === "connected" ? " 연결 해제" : " 연결하기")}
                className="mt-auto ml-auto h-[26px] rounded-full border-[#6b6c7b] px-[10px] text-[12px] leading-[17px] tracking-[-0.5px] text-[#6b6c7b] hover:border-[#6653fb] hover:bg-[#fafbff] hover:text-[#6653fb] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 dark:hover:bg-[#fafbff]"
            >
                {status === "connected"
                    ? "연결 해제"
                    : status === "expired"
                      ? "다시 연결"
                      : "연결하기"}
            </Button>
        </div>
    );
}
