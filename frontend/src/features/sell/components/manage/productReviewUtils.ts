import type {
    DefectStatus,
    DeliveryType,
    ProductCondition,
    ProductStatus,
    TradeMethod,
} from "@/features/sell/types";

export const conditionLabels: Record<ProductCondition, string> = {
    S: "미개봉",
    A: "거의 새 상품",
    B: "사용감 적음",
    C: "사용감 있음",
    D: "수리 필요",
};

export const statusLabels: Record<ProductStatus, string> = {
    DRAFT: "임시저장",
    ON_SALE: "판매중",
    SOLD_OUT: "판매완료",
};

export const defectLabels: Record<DefectStatus, string> = {
    NORMAL: "하자 없음",
    ISSUES: "하자 있음",
    UNKNOWN: "확인 필요",
};

export const tradeMethodLabels: Record<TradeMethod, string> = {
    DIRECT: "직거래",
    DELIVERY: "택배 거래",
};

export const deliveryTypeLabels: Record<Exclude<DeliveryType, null>, string> = {
    INCLUDED: "배송비 포함",
    PREPAID: "배송비 별도",
};

export const priceFormatter = new Intl.NumberFormat("ko-KR");

export function formatRegisteredAt(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "등록일 정보 없음";
    }

    const pad = (number: number) => String(number).padStart(2, "0");

    return `등록일 ${date.getFullYear()}. ${pad(date.getMonth() + 1)}. ${pad(date.getDate())}. ${pad(
        date.getHours(),
    )}:${pad(date.getMinutes())}`;
}

export function formatPurchasePeriod(months: number | null) {
    if (months === null) {
        return "구매 시기 미상";
    }

    if (months === 0) {
        return "구매 직후";
    }

    return `${months}개월 이내`;
}
