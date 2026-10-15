import {
    PRODUCT_PRICE_MAX,
    PRODUCT_PRICE_MIN,
    PRODUCT_PRICE_RANGE_ERROR,
} from "@/features/sell/schemas/productSchema";

import type { DirectStatusPriceErrors, DirectStatusPriceState } from "./types";

export function validateStatusPrice(
    statusPrice: Pick<
        DirectStatusPriceState,
        "price" | "tradeMethod" | "deliveryType" | "deliveryFee" | "tradeLocation"
    >,
): DirectStatusPriceErrors {
    const price = Number(statusPrice.price);
    const deliveryFee = Number(statusPrice.deliveryFee);

    return {
        price:
            Number.isInteger(price) && price >= PRODUCT_PRICE_MIN && price <= PRODUCT_PRICE_MAX
                ? ""
                : PRODUCT_PRICE_RANGE_ERROR,
        deliveryType:
            statusPrice.tradeMethod === "delivery" && !statusPrice.deliveryType
                ? "배송비 부담 방식을 선택해 주세요."
                : "",
        deliveryFee:
            statusPrice.tradeMethod === "delivery" && statusPrice.deliveryType === "PREPAID"
                ? deliveryFee >= 2_700 && deliveryFee <= 17_000
                    ? ""
                    : "배송비는 2,700원 이상 17,000원 이하로 입력해 주세요."
                : "",
        tradeLocation:
            statusPrice.tradeMethod === "direct" && !statusPrice.tradeLocation.trim()
                ? "거래 희망 지역을 선택해 주세요."
                : "",
    };
}
