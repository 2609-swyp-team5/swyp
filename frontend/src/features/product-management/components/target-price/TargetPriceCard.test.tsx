import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ManagementTargetPriceCard } from "./ManagementTargetPriceCard";
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

function renderManagementCard(
    props: Partial<Parameters<typeof ManagementTargetPriceCard>[0]> = {},
) {
    render(
        <ManagementTargetPriceCard
            title="목표 판매가"
            description="평균 시세가 이 금액 이상이 되면 알려드려요."
            targetPrice={null}
            reference={{ label: "최근 평균 시세", price: 320000 }}
            isSaving={false}
            error={null}
            onSave={vi.fn()}
            {...props}
        />,
    );
}

describe("TargetPriceCard", () => {
    it("입력한 금액을 쉼표로 보여 주고 숫자로 저장한다", async () => {
        const user = userEvent.setup();
        const onSave = renderCard();

        expect(screen.getAllByText("미설정")).toHaveLength(2);
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

    it("관심 상품은 목표 구매가 전용 카드로 추천가와 목표 등록가를 보여 준다", () => {
        renderManagementCard({
            title: "목표 구매가",
            description: "상품 가격이 이 금액 이하가 되면 알려드려요.",
            targetPrice: 450000,
            reference: {
                label: "현재 AI 추천 구매가",
                price: 469000,
                emphasized: true,
                supportingText: "시세 대비 +4.9%",
            },
            targetPriceNotificationEnabled: false,
        });

        expect(screen.getByText("알림 활성화")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "알림 활성화 설정으로 이동" })).toHaveAttribute(
            "href",
            "/my/notifications",
        );
        expect(screen.getByText("현재 AI 추천 구매가")).toBeInTheDocument();
        expect(screen.getByText("469,000원")).toBeInTheDocument();
        expect(screen.getByText("시세 대비 +4.9%")).toBeInTheDocument();
        expect(screen.getByText("목표 등록가")).toBeInTheDocument();
        expect(screen.getByText("450,000원")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "삭제하기" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "저장하기" })).toBeDisabled();
    });

    it("목표 가격 도달 알림이 켜져 있으면 활성화 링크를 숨긴다", () => {
        renderManagementCard({
            title: "목표 구매가",
            targetPriceNotificationEnabled: true,
        });

        expect(screen.queryByText("알림 활성화")).not.toBeInTheDocument();
    });

    it("판매 상품 관리도 같은 목표가 카드 구조를 사용한다", () => {
        renderManagementCard({
            title: "목표 판매가",
            targetPrice: 450000,
            reference: { label: "최근 평균 시세", price: 320000 },
        });

        expect(screen.getByText("최근 평균 시세")).toBeInTheDocument();
        expect(screen.getByText("320,000원")).toBeInTheDocument();
        expect(screen.getByText("목표 등록가")).toBeInTheDocument();
        expect(screen.getByText("450,000원")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "삭제하기" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "저장하기" })).toBeInTheDocument();
    });
});
