import {
    Activity,
    CircleAlert,
    Clock3,
    type LucideProps,
    Target,
    TrendingDown,
    TrendingUp,
    Unplug,
} from "lucide-react";

import type { NotificationType } from "../schemas/notificationSchema";

/** 알림 종류별 아이콘 — 판매 추천 상승, 구매 추천·목표가 하락, 보류·대기 시계, 시세 변동 그래프, 목표 판매가 과녁, 연동 만료 끊긴 플러그, 공지 경고. */
export function NotificationTypeIcon({ type, ...props }: { type: NotificationType } & LucideProps) {
    switch (type) {
        case "SELL":
            return <TrendingUp {...props} />;
        case "BUY":
        case "TARGET_PRICE":
            return <TrendingDown {...props} />;
        case "HOLD":
        case "WAIT":
            return <Clock3 {...props} />;
        case "SELL_PRICE_CHANGE":
        case "BUY_PRICE_CHANGE":
            return <Activity {...props} />;
        case "SELL_TARGET_PRICE":
            return <Target {...props} />;
        case "PLATFORM_EXPIRED":
            return <Unplug {...props} />;
        case "NOTICE":
            return <CircleAlert {...props} />;
    }
}
