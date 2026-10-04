import type { HomeSummaryResponse } from "../types";

export function getHomeSummaryCards(summary?: HomeSummaryResponse) {
    const analyzedAt = summary?.lastAnalyzedAt ? new Date(summary.lastAnalyzedAt) : null;
    const isToday = analyzedAt?.toDateString() === new Date().toDateString();
    const rate = summary?.marketPriceDiffRate;
    const counts = summary?.productStatusCounts;
    const cards = [
        {
            title: "등록한 물건",
            value: summary ? `${summary.productCount}개` : "—",
            description: counts
                ? `임시저장 ${counts.DRAFT} · 판매중 ${counts.ON_SALE} · 예약중 ${counts.RESERVED} · 판매완료 ${counts.SOLD_OUT}`
                : "",
        },
        {
            title: "AI 추천 알림",
            value: summary ? `${summary.todayRecommendationCount}건` : "—",
            description: "오늘 새로 분석된 타이밍",
        },
        {
            title: "평균 시세 대비",
            value:
                rate === null || rate === undefined
                    ? "—"
                    : `${rate > 0 ? "+" : ""}${rate.toFixed(1)}%`,
            description:
                summary && rate === null ? "분석된 물건이 없습니다." : "내 물건들의 현재 시세 평균",
        },
        {
            title: "최근 분석일",
            value: analyzedAt
                ? isToday
                    ? "오늘"
                    : analyzedAt.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
                : "—",
            description: analyzedAt
                ? analyzedAt.toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                  })
                : "아직 분석 이력이 없습니다.",
        },
    ];
    return summary
        ? cards
        : cards.map((card) => ({ ...card, description: "요약을 불러오는 중입니다." }));
}
