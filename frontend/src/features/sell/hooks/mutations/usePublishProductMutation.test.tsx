import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { usePublishProductMutation } from "./usePublishProductMutation";

const { publishProduct } = vi.hoisted(() => ({ publishProduct: vi.fn() }));

vi.mock("@/features/sell/api/productApi", () => ({
    productApi: { publishProduct },
}));

function setup() {
    const client = new QueryClient({ defaultOptions: { mutations: { gcTime: 0 } } });

    return renderHook(() => usePublishProductMutation(), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
    });
}

beforeEach(() => {
    publishProduct.mockReset();
});

it("returns the parsed platform result when the API response succeeds", async () => {
    publishProduct.mockResolvedValue({
        data: {
            success: true,
            message: "",
            data: {
                productPlatformId: 7,
                productId: 42,
                externalProductId: "bunjang-123",
                productUrl: "https://bunjang.co.kr/products/bunjang-123",
                status: "POSTED",
                updatedAt: "2026-10-03T00:00:00Z",
            },
            error: null,
        },
    });

    const { result } = setup();

    await act(async () => {
        await expect(
            result.current.mutateAsync({ productId: 42, platform: "BUNJANG" }),
        ).resolves.toMatchObject({ productId: 42, status: "POSTED" });
    });
});

it("turns success false into a mutation error in the hook", async () => {
    publishProduct.mockResolvedValue({
        data: {
            success: false,
            message: "번개장터 매물 등록 중 오류가 발생했어요.",
            data: null,
            error: { status: "502", code: "BAD_GATEWAY", details: null },
        },
    });

    const { result } = setup();

    act(() => result.current.mutate({ productId: 42, platform: "BUNJANG" }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("번개장터 매물 등록 중 오류가 발생했어요.");
    expect(publishProduct).toHaveBeenCalledTimes(1);
});
