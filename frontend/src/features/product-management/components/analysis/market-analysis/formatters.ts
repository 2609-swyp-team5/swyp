import { priceFormatter } from "@/features/sell/components/manage/productReviewUtils";

export function formatPrice(price: number | null) {
    return price === null ? "정보 없음" : `${priceFormatter.format(price)}원`;
}

export function formatManWon(price: number | null) {
    if (price === null) {
        return "정보 없음";
    }

    const value = price / 10000;
    return `${Number.isInteger(value) ? value : value.toFixed(1)}만 원`;
}

/**
 * 현재 판매가가 시세(최근 평균 등록가)보다 얼마나 높거나 낮은지 문장으로 쓴다(marketPriceDiffRate는 추천가가 아니라 현재
 * 판매가 기준이라 "시세 대비 +12%"처럼 숫자만 두면 옆 칸의 추천가 이야기로 읽힌다).
 */
export function describeDiffFromMarket(rate: number | null | undefined) {
    if (rate === null || rate === undefined) {
        return null;
    }
    const percent = `${Math.abs(rate).toFixed(1)}%`;
    if (Number(percent.slice(0, -1)) === 0) {
        return "시세와 같아요";
    }
    return rate > 0 ? `시세보다 ${percent} 높아요` : `시세보다 ${percent} 낮아요`;
}

export function formatSignedPercent(rate: number | null) {
    if (rate === null) {
        return "정보 없음";
    }

    return `${rate > 0 ? "+" : ""}${rate.toFixed(1)}%`;
}
