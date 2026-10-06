import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TargetPriceCard } from "./TargetPriceCard";

function renderCard(props: Partial<Parameters<typeof TargetPriceCard>[0]> = {}) {
    const onSave = vi.fn();
    render(
        <TargetPriceCard
            title="목표 판매가"
            description="평균 시세가 이 금액 이상이 되면 알려드려요."
            targetPrice={null}
            compareLabel="최근 평균 시세"
            comparePrice={320000}
            reached={false}
            reachedText="도달했어요"
            waitingText="기다리는 중"
            isSaving={false}
            error={null}
            onSave={onSave}
            {...props}
        />,
    );
    return onSave;
}

describe("TargetPriceCard", () => {
    it("입력한 금액을 쉼표로 보여 주고 숫자로 저장한다", async () => {
        const user = userEvent.setup();
        const onSave = renderCard();

        expect(screen.getByText("설정 안 함")).toBeInTheDocument();
        expect(screen.getByText("320,000원")).toBeInTheDocument();

        const input = screen.getByLabelText("목표 판매가 입력");
        await user.type(input, "300000");
        expect(input).toHaveValue("300,000");

        await user.click(screen.getByRole("button", { name: "설정" }));
        expect(onSave).toHaveBeenCalledWith(300000);
    });

    it("0원은 저장하지 않고 안내한다", async () => {
        const user = userEvent.setup();
        const onSave = renderCard();

        await user.type(screen.getByLabelText("목표 판매가 입력"), "0");
        await user.click(screen.getByRole("button", { name: "설정" }));

        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getByRole("alert")).toHaveTextContent("0원보다 크게");
    });

    it("목표가가 있으면 도달 상태를 보여 주고 해제하면 null로 저장한다", async () => {
        const user = userEvent.setup();
        const onSave = renderCard({ targetPrice: 300000, reached: true });

        expect(screen.getByText("도달")).toBeInTheDocument();
        expect(screen.getByText("도달했어요")).toBeInTheDocument();
        // 같은 금액이면 변경 버튼은 비활성
        expect(screen.getByRole("button", { name: "변경" })).toBeDisabled();

        await user.click(screen.getByRole("button", { name: "해제" }));
        expect(onSave).toHaveBeenCalledWith(null);
    });
});
