import type { InterestStatus } from "@/features/interest/types";
import type { ProductStatus } from "@/features/sell/types";

const sellerTargetPriceStatuses: ReadonlySet<ProductStatus> = new Set(["DRAFT", "ON_SALE"]);
const interestTargetPriceStatuses: ReadonlySet<InterestStatus> = new Set([
    "PENDING",
    "BUY",
    "WAIT",
]);

export function canSetSellerTargetPrice(status: ProductStatus) {
    return sellerTargetPriceStatuses.has(status);
}

export function canSetInterestTargetPrice(status: InterestStatus) {
    return interestTargetPriceStatuses.has(status);
}
