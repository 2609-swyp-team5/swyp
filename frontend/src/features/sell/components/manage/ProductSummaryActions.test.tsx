import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mutate, push, reset, deleteState } = vi.hoisted(() => ({
    mutate: vi.fn(),
    push: vi.fn(),
    reset: vi.fn(),
    deleteState: { error: null as Error | null },
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push }),
}));

vi.mock("@/features/sell/hooks/mutations/useDeleteProductMutation", () => ({
    useDeleteProductMutation: () => ({
        error: deleteState.error,
        isPending: false,
        mutate: vi.fn(),
        reset,
    }),
}));

vi.mock("@/features/sell/hooks/mutations/useUpdateProductStatusMutation", () => ({
    useUpdateProductStatusMutation: () => ({
        error: null,
        isPending: false,
        mutate,
        reset,
    }),
}));

import { ProductSummaryActions } from "./ProductSummaryActions";

describe("ProductSummaryActions", () => {
    beforeEach(() => {
        mutate.mockReset();
        push.mockReset();
        reset.mockReset();
        deleteState.error = null;
    });

    it("판매중인 상품에 판매완료 버튼을 표시하고 상태 변경을 요청한다", async () => {
        const user = userEvent.setup();

        render(
            <ProductSummaryActions
                product={{ id: 42, price: 250000 }}
                actionHref="/sell/manage/42/edit"
                canMarkAsSold
            />,
        );

        await user.click(screen.getByRole("button", { name: "판매완료" }));
        expect(
            screen.getByRole("heading", { name: "판매완료 정보를 입력해 주세요" }),
        ).toBeVisible();

        const confirmButton = screen
            .getAllByRole("button", { name: "판매완료" })
            .find((button) => button.closest('[role="alertdialog"]'));
        expect(confirmButton).toBeDefined();
        const soldPriceInput = screen.getByLabelText(/최종 거래 가격/);
        await user.clear(soldPriceInput);
        await user.type(soldPriceInput, "300000");
        await user.click(confirmButton!);

        expect(mutate).toHaveBeenCalledWith(
            {
                id: 42,
                status: "SOLD_OUT",
                soldPrice: 300000,
                soldPlatform: "번개장터",
            },
            expect.objectContaining({ onSuccess: expect.any(Function) }),
        );
    });

    it("판매완료 상태 변경이 불가능한 상품에는 버튼을 표시하지 않는다", () => {
        render(
            <ProductSummaryActions
                product={{ id: 42, price: 250000 }}
                actionHref="/sell/manage/42/edit"
            />,
        );

        expect(screen.queryByRole("button", { name: "판매완료" })).not.toBeInTheDocument();
    });

    it("상세보기 라벨을 사용하면 상품 확인 화면으로 이동한다", async () => {
        const user = userEvent.setup();

        render(
            <ProductSummaryActions
                product={{ id: 42, price: 250000 }}
                actionHref="/sell/manage/42"
                actionLabel="자세히보기"
                actionIconSrc="/sell/detail.svg"
            />,
        );

        await user.click(screen.getByRole("button", { name: "자세히보기" }));

        expect(push).toHaveBeenCalledWith("/sell/manage/42");
    });

    it("management variant는 판매완료·자세히 보기·삭제하기 액션을 함께 표시한다", () => {
        render(
            <ProductSummaryActions
                product={{ id: 42, price: 250000 }}
                actionHref="/sell/manage/42"
                canMarkAsSold
                variant="management"
            />,
        );

        expect(screen.getByRole("button", { name: "판매 완료" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "자세히 보기" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "삭제하기" })).toBeInTheDocument();
    });

    it("삭제 실패 시 axios 기본 문구 대신 서버가 보낸 안내 문구를 보여 준다", async () => {
        const user = userEvent.setup();
        const message =
            "상품에 연결된 기록이 방금 생겨 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.";
        deleteState.error = new AxiosError(
            "Request failed with status code 409",
            "ERR_BAD_REQUEST",
            undefined,
            null,
            {
                status: 409,
                statusText: "Conflict",
                headers: {},
                config: { headers: new AxiosHeaders() },
                data: {
                    success: false,
                    message,
                    data: null,
                    error: { status: "409", code: "PRODUCT_DELETE_CONFLICT", details: null },
                },
            },
        );

        render(
            <ProductSummaryActions
                product={{ id: 42, price: 250000 }}
                actionHref="/sell/manage/42"
                canMarkAsSold
                variant="management"
            />,
        );
        await user.click(screen.getByRole("button", { name: "삭제하기" }));

        expect(screen.getByText(message)).toBeVisible();
        expect(screen.queryByText(/status code 409/)).not.toBeInTheDocument();
    });
});
