"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { Button } from "@/common/components/ui/Button";
import { Input } from "@/common/components/ui/Input";
import type { MyPlatformType } from "@/features/my/types";

export type ConnectionStatus = "connected" | "expired" | "disconnected";
export type PlatformConnection = {
    id: MyPlatformType;
    name: string;
    icon: string;
    description: string;
    updated: string;
};
type PlatformCardProps = {
    item: PlatformConnection;
    status: ConnectionStatus;
    onSelect: (cookie: string) => void;
    isPending: boolean;
};

export function PlatformCard({ item, status, onSelect, isPending }: PlatformCardProps) {
    const [connectionValue, setConnectionValue] = useState("");
    const [hasError, setHasError] = useState(false);
    const errorId = `${item.id}-connection-error`;
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isPending) return;
        if (status !== "connected" && !connectionValue.trim()) {
            setHasError(true);
            return;
        }
        setHasError(false);
        onSelect(connectionValue.trim());
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex min-h-[154px] flex-col rounded-[10px] border border-[#dedee6] bg-white px-5 pt-5 pb-[15px]"
        >
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
                              ? `${item.name}이 연결되어 있어요.`
                              : `${item.name}이 연결되지 않았어요.`}
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
            {status !== "connected" && (
                <div className="mt-[10px]">
                    <Input
                        type="password"
                        autoComplete="new-password"
                        disabled={isPending}
                        aria-label={`${item.name} 연결 정보`}
                        aria-required="true"
                        aria-invalid={hasError}
                        aria-describedby={hasError ? errorId : undefined}
                        placeholder={`${item.name} 토큰을 입력해주세요`}
                        value={connectionValue}
                        onChange={(event) => {
                            setConnectionValue(event.target.value);
                            if (event.target.value.trim()) setHasError(false);
                        }}
                        className="h-9 border-[#dedee6] bg-white text-[13px] placeholder:text-[#83889e] md:text-[13px]"
                    />
                    {hasError && (
                        <p
                            id={errorId}
                            role="alert"
                            className="text-destructive mt-1 text-xs leading-5"
                        >
                            연결 정보를 입력해주세요.
                        </p>
                    )}
                </div>
            )}
            <Button
                variant="outline"
                type="submit"
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
        </form>
    );
}
