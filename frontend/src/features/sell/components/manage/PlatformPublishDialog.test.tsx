import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { push, useMyPlatformsQuery, usePublishProductMutation } = vi.hoisted(() => ({
    push: vi.fn(),
    useMyPlatformsQuery: vi.fn(),
    usePublishProductMutation: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push }),
}));

vi.mock("@/features/my/hooks/queries/useMyPlatformsQuery", () => ({
    useMyPlatformsQuery,
}));

vi.mock("@/features/sell/hooks/mutations/usePublishProductMutation", () => ({
    usePublishProductMutation,
}));

import { Button } from "@/common/components/ui/Button";
import { PlatformPublishDialog } from "./PlatformPublishDialog";

const connectedPlatform = {
    platform: "BUNJANG" as const,
    platformName: "번개장터",
    status: "CONNECTED" as const,
    updatedAt: "2026-10-04T10:00:00",
};

const postedProductPlatform = {
    platform: "BUNJANG" as const,
    platformName: "번개장터",
    status: "POSTED" as const,
    externalProductId: "bunjang-42",
    productUrl: "https://m.bunjang.co.kr/products/437356002",
    createdAt: "2026-10-04T10:00:00",
    updatedAt: "2026-10-04T10:00:00",
};

describe("PlatformPublishDialog", () => {
    beforeEach(() => {
        push.mockReset();
        useMyPlatformsQuery.mockReturnValue({
            data: [connectedPlatform],
            error: null,
            isPending: false,
            refetch: vi.fn(),
        });
        usePublishProductMutation.mockReturnValue({
            isPending: false,
            mutateAsync: vi.fn().mockResolvedValue({
                productPlatformId: 1,
                productId: 42,
                externalProductId: "bunjang-42",
                productUrl: "https://m.bunjang.co.kr/products/bunjang-42",
                status: "POSTED",
                updatedAt: "2026-10-04T10:00:00",
            }),
        });
    });

    it("opens the platform selection popup and publishes the selected platform", async () => {
        const user = userEvent.setup();

        render(
            <PlatformPublishDialog productId={42} existingPlatforms={[]}>
                <Button type="button">다른 플랫폼에 등록하기</Button>
            </PlatformPublishDialog>,
        );

        await user.click(screen.getByRole("button", { name: "다른 플랫폼에 등록하기" }));
        expect(screen.getByRole("dialog")).toHaveTextContent("게시할 플랫폼을 선택해주세요");

        await user.click(screen.getByRole("checkbox", { name: "번개장터 게시 선택" }));
        await user.click(screen.getByRole("button", { name: "선택한 플랫폼에 게시하기" }));

        expect(await screen.findByText("플랫폼에 등록됐어요")).toBeVisible();
        expect(screen.getByText("등록완료")).toBeVisible();
        expect(
            screen.getByRole("link", { name: "번개장터 상품 페이지 바로가기" }),
        ).toHaveTextContent("바로가기");
        expect(screen.getByRole("link", { name: "번개장터 상품 페이지 바로가기" })).toHaveAttribute(
            "href",
            "https://m.bunjang.co.kr/products/bunjang-42",
        );
        expect(screen.getByRole("link", { name: "번개장터 상품 페이지 바로가기" })).toHaveAttribute(
            "target",
            "_blank",
        );
    });

    it("hides the checkbox and shows a shortcut for an already posted platform", async () => {
        const user = userEvent.setup();

        render(
            <PlatformPublishDialog productId={42} existingPlatforms={[postedProductPlatform]}>
                <Button type="button">다른 플랫폼에 등록하기</Button>
            </PlatformPublishDialog>,
        );

        await user.click(screen.getByRole("button", { name: "다른 플랫폼에 등록하기" }));

        expect(
            screen.queryByRole("checkbox", { name: "번개장터 게시 선택" }),
        ).not.toBeInTheDocument();
        expect(screen.getByText("등록완료")).toBeVisible();
        expect(screen.getByRole("link", { name: "번개장터 상품 페이지 바로가기" })).toHaveAttribute(
            "href",
            postedProductPlatform.productUrl,
        );
        expect(screen.getByRole("button", { name: "선택한 플랫폼에 게시하기" })).toBeDisabled();
    });

    it("moves to my platforms when the selected platform is not connected", async () => {
        const user = userEvent.setup();
        useMyPlatformsQuery.mockReturnValue({
            data: [{ ...connectedPlatform, status: "DISCONNECTED", updatedAt: null }],
            error: null,
            isPending: false,
            refetch: vi.fn(),
        });

        render(
            <PlatformPublishDialog productId={42} existingPlatforms={[]}>
                <Button type="button">다른 플랫폼에 등록하기</Button>
            </PlatformPublishDialog>,
        );

        await user.click(screen.getByRole("button", { name: "다른 플랫폼에 등록하기" }));
        await user.click(screen.getByRole("button", { name: "연동하기" }));

        expect(push).toHaveBeenCalledWith("/my/platforms");
    });

    it("closes and resets the selection when cancel is clicked", async () => {
        const user = userEvent.setup();

        render(
            <PlatformPublishDialog productId={42} existingPlatforms={[]}>
                <Button type="button">다른 플랫폼에 등록하기</Button>
            </PlatformPublishDialog>,
        );

        await user.click(screen.getByRole("button", { name: "다른 플랫폼에 등록하기" }));
        await user.click(screen.getByRole("checkbox", { name: "번개장터 게시 선택" }));
        expect(screen.getByRole("button", { name: "선택한 플랫폼에 게시하기" })).toBeEnabled();

        await user.click(screen.getByRole("button", { name: "취소" }));
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "다른 플랫폼에 등록하기" }));
        expect(screen.getByRole("checkbox", { name: "번개장터 게시 선택" })).not.toBeChecked();
        expect(screen.getByRole("button", { name: "선택한 플랫폼에 게시하기" })).toBeDisabled();
    });
});
