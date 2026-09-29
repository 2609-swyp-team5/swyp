import { type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";

import { useAuthStore } from "@/features/auth/store/authStore";
import { useSearchQuery } from "./useSearchQuery";

const { searchList } = vi.hoisted(() => ({ searchList: vi.fn() }));
vi.mock("@/features/search/api/searchApi", () => ({ searchApi: { searchList } }));
vi.mock("@/features/auth/api/authApi", () => ({ authApi: {} }));

function createWrapper() {
    const client = new QueryClient();
    return function Wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

beforeEach(() => {
    searchList.mockReset();
    searchList.mockResolvedValue({
        data: { success: true, data: { content: [], nextCursor: null, hasNext: false } },
    });
    useAuthStore.setState({ accessToken: null, isInitialized: false, isLoggedIn: false });
});

it("waits for authentication before requesting the product list", async () => {
    const { result } = renderHook(() => useSearchQuery({ size: 9 }), {
        wrapper: createWrapper(),
    });
    expect(searchList).not.toHaveBeenCalled();
    act(() => useAuthStore.setState({ isInitialized: true }));
    expect(searchList).not.toHaveBeenCalled();
    act(() => useAuthStore.setState({ accessToken: "token", isLoggedIn: true }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ content: [], nextCursor: null, hasNext: false });
    expect(searchList).toHaveBeenCalledWith({ size: 9 }, expect.any(AbortSignal));
});

it("reports an HTTP 200 business failure instead of rendering it as an empty result", async () => {
    useAuthStore.setState({ accessToken: "token", isInitialized: true, isLoggedIn: true });
    searchList.mockResolvedValue({
        data: { success: false, message: "상품 조회 실패", data: null },
    });
    const { result } = renderHook(() => useSearchQuery({ size: 9 }), {
        wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("상품 조회 실패");
    expect(searchList).toHaveBeenCalledTimes(1);
});

it("cancels the old request when keyword, status, and cursor change", async () => {
    useAuthStore.setState({ accessToken: "token", isInitialized: true, isLoggedIn: true });
    let oldSignal: AbortSignal | undefined;
    searchList.mockImplementationOnce((_params, signal: AbortSignal) => {
        oldSignal = signal;
        return new Promise(() => {});
    });
    const { result, rerender } = renderHook(
        ({ keyword, cursor }: { keyword: string; cursor?: number }) =>
            useSearchQuery({ keyword, cursor, status: "ON_SALE", size: 9 }),
        {
            initialProps: { keyword: "아이폰", cursor: undefined as number | undefined },
            wrapper: createWrapper(),
        },
    );
    await waitFor(() => expect(searchList).toHaveBeenCalledTimes(1));
    rerender({ keyword: "갤럭시", cursor: 123456789 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(oldSignal?.aborted).toBe(true);
    expect(searchList).toHaveBeenLastCalledWith(
        { keyword: "갤럭시", cursor: 123456789, status: "ON_SALE", size: 9 },
        expect.any(AbortSignal),
    );
});
