"use client";

import { Button } from "@/common/components/ui/Button";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { MyPageContent } from "@/features/my/components/MyPageContent";
import { NotificationGroup } from "@/features/my/components/notifications/NotificationGroup";
import { useUpdateNotificationSettingsMutation } from "@/features/notifications/hooks/mutations/useUpdateNotificationSettingsMutation";
import { useNotificationSettingsQuery } from "@/features/notifications/hooks/queries/useNotificationSettingsQuery";
import { setPushEnabled, usePushEnabled } from "@/features/notifications/lib/pushPreference";
import type { NotificationSettingKey } from "@/features/notifications/schemas/notificationSchema";

// id가 서버 설정 키면 서버에, "push"면 이 브라우저에 저장한다(주간 리포트·이메일·SMS는 미지원이라 숨김)
const pushId = "push";

const groups: {
    title: string;
    items: { id: NotificationSettingKey | typeof pushId; title: string; description: string }[];
}[] = [
    {
        title: "AI 분석 알림",
        items: [
            {
                id: "recommendationEnabled",
                title: "AI 추천 타이밍 알림",
                description: "최적 판매·구매 타이밍(판매/보류/구매/대기)이 바뀌면 알려드려요.",
            },
            {
                id: "priceChangeEnabled",
                title: "시세 변동 알림",
                description: "등록한 물건의 시세가 크게 변동하면 알려드려요.",
            },
        ],
    },
    {
        title: "계정 알림",
        items: [
            {
                id: "platformExpiryEnabled",
                title: "플랫폼 연동 만료 알림",
                description: "연결된 중고 플랫폼 로그인이 만료되면 알려드려요.",
            },
            {
                id: "marketingEnabled",
                title: "마케팅·이벤트 알림",
                description: "새로운 기능, 이벤트 소식을 전달해 드려요.",
            },
        ],
    },
    {
        title: "알림 수신 채널",
        items: [
            {
                id: pushId,
                title: "푸시 알림",
                description:
                    "사이트를 보고 있을 때 새 알림을 화면 구석에 띄워 드려요(이 브라우저에만 적용).",
            },
        ],
    },
];

export function MyNotificationsPage() {
    const settingsQuery = useNotificationSettingsQuery();
    const updateMutation = useUpdateNotificationSettingsMutation();
    const pushEnabled = usePushEnabled();
    const enabled: Record<string, boolean> = { ...settingsQuery.data, [pushId]: pushEnabled };

    const handleChange = (id: string, value: boolean) => {
        if (id === pushId) {
            setPushEnabled(value);
            return;
        }
        updateMutation.mutate({ [id]: value });
    };

    return (
        <MyPageContent
            eyebrow="계정 설정"
            title="알림 설정"
            eyebrowClassName="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#83889e]"
            titleClassName="text-[#464646]"
        >
            <div className="w-full space-y-4">
                {settingsQuery.isError && (
                    <div className="flex items-center gap-3">
                        <p role="alert" className="text-destructive text-sm">
                            {getApiErrorMessage(settingsQuery.error)}
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => void settingsQuery.refetch()}
                        >
                            다시 시도
                        </Button>
                    </div>
                )}
                {updateMutation.isError && (
                    <p role="alert" className="text-destructive text-sm">
                        설정을 저장하지 못했습니다. {getApiErrorMessage(updateMutation.error)}
                    </p>
                )}
                {groups.map((group) => (
                    <NotificationGroup
                        key={group.title}
                        group={group}
                        enabled={enabled}
                        onCheckedChange={handleChange}
                        disabled={
                            group.items.every((item) => item.id !== pushId) &&
                            (!settingsQuery.data || updateMutation.isPending)
                        }
                    />
                ))}
            </div>
        </MyPageContent>
    );
}
