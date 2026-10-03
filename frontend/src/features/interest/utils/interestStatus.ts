import type { InterestListItem } from "../types";

export type InterestDisplayStatus = "BUY" | "WAIT" | "SOLD_OUT";

export function getInterestDisplayStatus(
    interest: Pick<InterestListItem, "source" | "status" | "recommendation">,
): InterestDisplayStatus {
    const isSoldOut =
        interest.source === "OUR"
            ? interest.status === "SOLD_OUT"
            : !["SELLING", "ON_SALE"].includes(interest.status);

    if (isSoldOut) {
        return "SOLD_OUT";
    }

    return interest.recommendation === "BUY" ? "BUY" : "WAIT";
}
