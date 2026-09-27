"use client";

import { useState } from "react";
import Image from "next/image";
import { Grape, Sparkles } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/common/components/ui/AlertDialog";
import { MyPageContent } from "@/features/my/components/MyPageContent";

type ConnectionStatus = "connected" | "expired" | "disconnected";
const statusLabels: Record<ConnectionStatus, string> = {
    connected: "연결됨",
    expired: "만료됨",
    disconnected: "미연결",
};
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

export default function MyPlatformsPage() {
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
            <div className="mb-[30px] grid grid-cols-3 gap-3 pt-[60px]">
                {(Object.keys(statusLabels) as ConnectionStatus[]).map((status) => (
                    <div
                        key={status}
                        className="flex min-h-[84px] flex-col justify-end rounded-[10px] border border-[#d3d3d3] bg-white px-5 py-[10px] text-[#6b6c7b]"
                    >
                        <p className="text-[32px] leading-[42px] font-bold tracking-[0.5px]">
                            {Object.values(statuses).filter((value) => value === status).length}
                        </p>
                        <p className="text-[15px] leading-[22px] font-semibold tracking-[-0.5px]">
                            {statusLabels[status]}
                        </p>
                    </div>
                ))}
            </div>
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
                {platforms.map((item) => {
                    const status = statuses[item.id];
                    return (
                        <div
                            key={item.id}
                            className="flex min-h-[154px] flex-col rounded-[10px] border border-[#dedee6] bg-white px-5 pt-5 pb-[15px]"
                        >
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
                                    <p className="text-[12px] leading-[18px] text-[#83889e]">
                                        {item.updated}
                                    </p>
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
                                onClick={() => setSelected(item)}
                                aria-label={
                                    item.name +
                                    (status === "connected" ? " 연결 해제" : " 연결하기")
                                }
                                className="mt-auto ml-auto h-[26px] rounded-full border-[#6b6c7b] px-[10px] text-[12px] leading-[17px] tracking-[-0.5px] text-[#6b6c7b] hover:border-[#5d55fe] hover:bg-white hover:text-[#5d55fe]"
                            >
                                {status === "connected"
                                    ? "연결 해제"
                                    : status === "expired"
                                      ? "다시 연결"
                                      : "연결하기"}
                            </Button>
                        </div>
                    );
                })}
            </div>
            <AlertDialog
                open={selected !== null}
                onOpenChange={(open) => {
                    if (!open) setSelected(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {selected?.name} {disconnecting ? "연결 해제" : "연결"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {disconnecting
                                ? "연결을 해제하면 해당 플랫폼의 판매 상태 동기화가 중단됩니다."
                                : "이 플랫폼과 연결하고 판매 상태를 동기화할까요?"}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (selected)
                                    setStatuses((current) => ({
                                        ...current,
                                        [selected.id]: disconnecting ? "disconnected" : "connected",
                                    }));
                            }}
                        >
                            {disconnecting ? "연결 해제" : "연결하기"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MyPageContent>
    );
}
