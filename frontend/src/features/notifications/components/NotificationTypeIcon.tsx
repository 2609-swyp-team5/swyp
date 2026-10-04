import { CircleAlert, Clock3, type LucideProps, TrendingDown, TrendingUp } from "lucide-react";

import type { NotificationType } from "../schemas/notificationSchema";

/** 알림 종류별 아이콘 — 판매 추천 상승, 구매 추천·목표가 하락, 보류·대기 시계, 공지 경고. */
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
        case "NOTICE":
            return <CircleAlert {...props} />;
    }
}
