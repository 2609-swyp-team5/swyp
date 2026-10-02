import { priceFormatter } from "@/features/sell/components/manage/productReviewUtils";

export function formatPrice(price: number) {
    return `${priceFormatter.format(price)}원`;
}

export function formatManWon(price: number) {
    const value = price / 10000;
    return `${Number.isInteger(value) ? value : value.toFixed(1)}만 원`;
}

export function formatSignedPercent(rate: number) {
    return `${rate > 0 ? "+" : ""}${rate.toFixed(1)}%`;
}
