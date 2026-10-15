import { useState } from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
    TradeMethodField,
    type DeliveryTypeValue,
    type TradeMethodValue,
} from "./TradeMethodField";

function TradeMethodFieldHarness() {
    const [tradeMethod, setTradeMethod] = useState<TradeMethodValue>("delivery");
    const [deliveryType, setDeliveryType] = useState<DeliveryTypeValue>(null);
    const [deliveryFee, setDeliveryFee] = useState("");

    return (
        <TradeMethodField
            tradeMethod={tradeMethod}
            deliveryType={deliveryType}
            deliveryFee={deliveryFee}
            tradeLocation=""
            onTradeMethodChange={setTradeMethod}
            onDeliveryTypeChange={setDeliveryType}
            onDeliveryFeeChange={setDeliveryFee}
            onTradeLocationChange={() => undefined}
            errors={{}}
            idPrefix="edit"
        />
    );
}

describe("TradeMethodField", () => {
    it("shows the delivery fee input when separate shipping is selected", async () => {
        const user = userEvent.setup();

        render(<TradeMethodFieldHarness />);

        expect(screen.queryByLabelText("배송비")).not.toBeInTheDocument();

        await user.click(screen.getByRole("radio", { name: "배송비 별도" }));

        expect(screen.getByLabelText("배송비")).toBeInTheDocument();
    });
});
