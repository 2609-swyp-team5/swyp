"use client";

import { useState } from "react";

import { MyPageContent } from "@/features/my/components/MyPageContent";

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

import { NotificationGroup } from "@/features/my/components/notifications/NotificationGroup";

export function MyNotificationsPage() {
    const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(
            groups.flatMap((group) => group.items.map((item) => [item.id, item.enabled])),
        ),
    );
    return (
        <MyPageContent
            eyebrow="계정 설정"
            title="알림 설정"
            eyebrowClassName="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#83889e]"
            titleClassName="text-[#464646]"
        >
            <div className="w-full space-y-4">
                {groups.map((group) => (
                    <NotificationGroup
                        key={group.title}
                        group={group}
                        enabled={enabled}
                        onCheckedChange={(id, value) =>
                            setEnabled((current) => ({ ...current, [id]: value }))
                        }
                    />
                ))}
            </div>
        </MyPageContent>
    );
}
