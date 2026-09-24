"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { Badge } from "@/common/components/ui/Badge";
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
import { cn } from "@/common/lib/utils";
import { MyPageContent, MyPanel } from "@/features/my/components/MyPageContent";

type ConnectionStatus = "connected" | "expired" | "disconnected";
const statusStyles = {
    connected: { label: "연결됨", className: "border-green-200 bg-green-50 text-green-600" },
    expired: { label: "만료됨", className: "border-amber-200 bg-amber-50 text-amber-600" },
    disconnected: { label: "미연결", className: "border-border bg-muted/50 text-muted-foreground" },
};
const platforms = [
    {
        id: "bunjang",
        name: "번개장터",
        icon: "⚡",
        description: "중고거래 플랫폼",
        status: "expired",
    },
    {
        id: "joongna",
        name: "중고나라",
        icon: "🛒",
        description: "대한민국 최대 중고마켓",
        status: "expired",
    },
    {
        id: "carrot",
        name: "당근마켓",
        icon: "🥕",
        description: "동네 직거래 플랫폼",
        status: "connected",
    },
    {
        id: "fruits",
        name: "후르츠패밀리",
        icon: "🍇",
        description: "명품·프리미엄 중고거래",
        status: "disconnected",
    },
] as const;

export default function MyPlatformsPage() {
    const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>(() =>
        Object.fromEntries(platforms.map((item) => [item.id, item.status])),
    );
    const [selected, setSelected] = useState<(typeof platforms)[number] | null>(null);
    const disconnecting = selected !== null && statuses[selected.id] === "connected";
    return (
        <MyPageContent eyebrow="연동 관리" title="플랫폼 별 연동 확인">
            <div className="mb-6 grid grid-cols-3 gap-3">
                {(Object.keys(statusStyles) as ConnectionStatus[]).map((status) => (
                    <MyPanel
                        key={status}
                        className={cn("p-4 sm:px-5", statusStyles[status].className)}
                    >
                        <p className="typography-heading-03 leading-[42px] font-bold">
                            {Object.values(statuses).filter((value) => value === status).length}
                        </p>
                        <p className="text-[13px] leading-5">{statusStyles[status].label}</p>
                    </MyPanel>
                ))}
            </div>
            <div className="border-primary/20 bg-primary/5 mb-6 flex items-start gap-3 rounded-2xl border px-5 py-5">
                <Sparkles className="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div>
                    <h2 className="text-primary text-base font-semibold">
                        연동하면 AI 시세 분석이 더 정확해져요
                    </h2>
                    <p className="text-muted-foreground mt-1 text-[13px] leading-5">
                        판매 중인 물건의 상태를 자동으로 동기화하고 최적의 판매 타이밍을
                        알려드립니다.
                    </p>
                </div>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
                {platforms.map((item) => {
                    const status = statuses[item.id];
                    const style = statusStyles[status];
                    return (
                        <MyPanel
                            key={item.id}
                            className={cn(
                                "flex-row flex-wrap items-center gap-4 p-5",
                                status === "expired"
                                    ? "border-amber-200"
                                    : status === "connected"
                                      ? "border-green-200"
                                      : "",
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                            >
                                {item.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="font-semibold">{item.name}</h2>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "gap-1 rounded-full text-xs",
                                            style.className,
                                        )}
                                    >
                                        <span aria-hidden="true">•</span>
                                        {style.label}
                                    </Badge>
                                </div>
                                <p className="text-muted-foreground mt-1 text-[13px] leading-5">
                                    {item.description}
                                </p>
                                {status === "expired" ? (
                                    <p className="text-xs leading-5 text-amber-600">
                                        세션이 만료되었습니다
                                    </p>
                                ) : status === "connected" ? (
                                    <p className="text-muted-foreground text-xs leading-5">
                                        {item.id === "carrot"
                                            ? "2026.09.01 연결 · 판매 중 1건"
                                            : "연결된 플랫폼"}
                                    </p>
                                ) : null}
                            </div>
                            <Button
                                variant={status === "disconnected" ? "default" : "outline"}
                                onClick={() => setSelected(item)}
                                aria-label={
                                    item.name +
                                    (status === "connected" ? " 연결 해제" : " 연결하기")
                                }
                                className={cn(
                                    "h-9 rounded-xl px-4 text-[13px]",
                                    status === "expired" ? "border-amber-300 text-amber-600" : "",
                                )}
                            >
                                {status === "connected"
                                    ? "연결 해제"
                                    : status === "expired"
                                      ? "다시 연결"
                                      : "연결하기"}
                            </Button>
                        </MyPanel>
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
