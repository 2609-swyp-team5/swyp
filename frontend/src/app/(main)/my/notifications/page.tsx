"use client";

import { useState } from "react";

import { Label } from "@/common/components/ui/Label";
import { Switch } from "@/common/components/ui/Switch";
import { MyPageContent, MyPanel } from "@/features/my/components/MyPageContent";

const groups = [
    {
        title: "AI 분석 알림",
        items: [
            {
                id: "timing",
                title: "AI 추천 타이밍 알림",
                description: "최적 판매 타이밍을 분석하면 알려드려요.",
                enabled: true,
            },
            {
                id: "price",
                title: "시세 변동 알림",
                description: "등록한 물건의 시세가 크게 변동하면 알려드려요.",
                enabled: true,
            },
            {
                id: "weekly",
                title: "주간 분석 리포트",
                description: "매주 월요일 내 물건들의 분석 요약을 보내드려요.",
                enabled: false,
            },
        ],
    },
    {
        title: "계정 알림",
        items: [
            {
                id: "expiry",
                title: "플랫폼 연동 만료 알림",
                description: "연결된 중고 플랫폼 로그인이 만료되면 알려드려요.",
                enabled: true,
            },
            {
                id: "marketing",
                title: "마케팅·이벤트 알림",
                description: "새로운 기능, 이벤트 소식을 전달해 드려요.",
                enabled: false,
            },
        ],
    },
    {
        title: "알림 수신 채널",
        items: [
            {
                id: "push",
                title: "푸시 알림",
                description: "앱 및 브라우저 푸시 알림을 수신합니다.",
                enabled: true,
            },
            {
                id: "email",
                title: "이메일 알림",
                description: "등록된 이메일로 알림을 수신합니다.",
                enabled: false,
            },
            {
                id: "sms",
                title: "SMS 알림",
                description: "등록된 휴대폰 번호로 문자 알림을 수신합니다.",
                enabled: false,
            },
        ],
    },
];

export default function MyNotificationsPage() {
    const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(
            groups.flatMap((group) => group.items.map((item) => [item.id, item.enabled])),
        ),
    );
    return (
        <MyPageContent eyebrow="계정 설정" title="알림 설정">
            <div className="w-full space-y-4">
                {groups.map((group) => (
                    <MyPanel key={group.title} className="p-0">
                        <h2 className="bg-muted/50 text-muted-foreground border-b px-6 py-4 text-[13px] leading-5 font-semibold">
                            {group.title}
                        </h2>
                        <div className="divide-y">
                            {group.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between gap-5 px-6 py-5"
                                >
                                    <div className="min-w-0">
                                        <Label
                                            htmlFor={item.id}
                                            className="text-base leading-[25px] font-semibold"
                                        >
                                            {item.title}
                                        </Label>
                                        <p
                                            id={item.id + "-description"}
                                            className="text-muted-foreground mt-1 text-[13px] leading-5"
                                        >
                                            {item.description}
                                        </p>
                                    </div>
                                    <Switch
                                        id={item.id}
                                        checked={enabled[item.id]}
                                        onCheckedChange={(value) =>
                                            setEnabled((current) => ({
                                                ...current,
                                                [item.id]: value,
                                            }))
                                        }
                                        aria-describedby={item.id + "-description"}
                                        className="data-[size=default]:h-6 data-[size=default]:w-11 [&_[data-slot=switch-thumb]]:size-5 [&_[data-slot=switch-thumb][data-state=checked]]:translate-x-[22px]"
                                    />
                                </div>
                            ))}
                        </div>
                    </MyPanel>
                ))}
            </div>
        </MyPageContent>
    );
}
