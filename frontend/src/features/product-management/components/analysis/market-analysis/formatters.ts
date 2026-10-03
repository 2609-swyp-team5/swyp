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

export function formatSignedPercent(rate: number | null) {
    if (rate === null) {
        return "정보 없음";
    }

    return `${rate > 0 ? "+" : ""}${rate.toFixed(1)}%`;
}
