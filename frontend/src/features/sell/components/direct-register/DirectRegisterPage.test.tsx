import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push }),
}));

vi.mock("@/features/sell/hooks/queries/useCategoriesQuery", () => ({
    useCategoriesQuery: () => ({
        data: [],
        isPending: false,
        isError: false,
    }),
}));

vi.mock("@/features/sell/hooks/mutations/useCreateDirectProductMutation", () => ({
    useCreateDirectProductMutation: () => ({ mutate: vi.fn() }),
}));

import { DirectRegisterPage } from "./DirectRegisterPage";

describe("DirectRegisterPage", () => {
    it("validates price and a delivery-cost option before final confirmation", async () => {
        const user = userEvent.setup();

        render(<DirectRegisterPage initialStep="status" />);

        await user.click(screen.getByRole("button", { name: "AI 분석 & 등록확인" }));
        expect(screen.getByText("희망 가격을 입력해 주세요.")).toBeInTheDocument();

        await user.type(screen.getByLabelText("희망 가격"), "800000");
        await user.click(screen.getByRole("radio", { name: "택배 거래" }));
        await user.click(screen.getByRole("button", { name: "AI 분석 & 등록확인" }));

        expect(screen.getByText("배송비 부담 방식을 선택해 주세요.")).toBeInTheDocument();
        expect(screen.queryByLabelText("거래 희망 지역")).not.toBeInTheDocument();
    });
});
