import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";

import { useAuthStore } from "@/features/auth/store/authStore";
import { useWithdrawMutation } from "./useWithdrawMutation";

const { memberWithdraw } = vi.hoisted(() => ({ memberWithdraw: vi.fn() }));
vi.mock("@/features/member/api/memberApi", () => ({ memberApi: { memberWithdraw } }));
vi.mock("@/features/auth/api/authApi", () => ({ authApi: {} }));

function setup() {
    const client = new QueryClient();
    return renderHook(() => useWithdrawMutation(), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
    });
}

beforeEach(() => {
    memberWithdraw.mockReset();
    useAuthStore.setState({ accessToken: "token", isLoggedIn: true, isInitialized: true });
});

it("returns success and leaves authentication cleanup to the completion dialog", async () => {
    memberWithdraw.mockResolvedValue({ data: { success: true, message: "탈퇴 완료", data: null } });
    const { result } = setup();
    await act(async () => {
        await result.current.mutateAsync();
    });
    expect(memberWithdraw).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({ accessToken: "token", isLoggedIn: true });
});

it("preserves authentication on a business failure", async () => {
    memberWithdraw.mockResolvedValue({
        data: { success: false, message: "탈퇴 실패", data: null },
    });
    const { result } = setup();
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("탈퇴 실패");
    expect(useAuthStore.getState()).toMatchObject({ accessToken: "token", isLoggedIn: true });
    expect(memberWithdraw).toHaveBeenCalledTimes(1);
});

it("preserves authentication and does not retry network failures", async () => {
    memberWithdraw.mockRejectedValue(new Error("Network error"));
    const { result } = setup();
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useAuthStore.getState()).toMatchObject({ accessToken: "token", isLoggedIn: true });
    expect(memberWithdraw).toHaveBeenCalledTimes(1);
});
