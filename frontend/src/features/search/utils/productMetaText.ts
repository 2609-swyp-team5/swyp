import {
    conditionLabels,
    defectLabels,
} from "@/features/sell/components/manage/productReviewUtils";
import type { SearchResultItem } from "@/features/search/types";

/** "거의 새 상품 · 하자 없음"처럼 상품 상태·하자 상태를 이어 붙인다(없는 값은 생략) */
export function formatConditionText(
    condition: SearchResultItem["condition"],
    defectStatus: SearchResultItem["defectStatus"],
) {
    return [
        condition ? conditionLabels[condition] : null,
        defectStatus ? defectLabels[defectStatus] : null,
    ].filter(Boolean);
}

/** "서울 강남구 · 택배 가능"처럼 거래 지역·택배 여부를 이어 붙인다(없는 값은 생략) */
export function formatTradeInfoText(region: string | null, deliveryAvailable: boolean | null) {
    return [
        region,
        deliveryAvailable === true ? "택배 가능" : deliveryAvailable === false ? "택배 불가" : null,
    ]
        .filter(Boolean)
        .join(" · ");
}
