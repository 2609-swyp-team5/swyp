import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProductRegistrationProcessing } from "./ProductRegistrationProcessing";

describe("ProductRegistrationProcessing", () => {
    it("shows the registration error and lets the user retry or exit", async () => {
        const user = userEvent.setup();
        const onRetry = vi.fn();
        const onGoToManage = vi.fn();

        render(
            <ProductRegistrationProcessing
                kind="ai"
                status="error"
                errorMessage="등록 요청이 실패했어요."
                onRetry={onRetry}
                onGoToManage={onGoToManage}
            />,
        );

        expect(screen.getByRole("heading", { name: "등록에 실패했어요" })).toBeInTheDocument();
        expect(screen.getByText("등록 요청이 실패했어요.")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "다시 시도" }));
        await user.click(screen.getByRole("button", { name: "나가기" }));

        expect(onRetry).toHaveBeenCalledTimes(1);
        expect(onGoToManage).toHaveBeenCalledTimes(1);
    });
});
