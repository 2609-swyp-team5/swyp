import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";

import { QueryProvider } from "@/common/providers/QueryProvider";
import AuthInitializer from "@/features/auth/components/AuthInitializer";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useMeQuery } from "./useMeQuery";

const { memberMe } = vi.hoisted(() => ({ memberMe: vi.fn() }));
vi.mock("@/features/member/api/memberApi", () => ({ memberApi: { memberMe } }));
vi.mock("@/features/auth/api/authApi", () => ({ authApi: {} }));
vi.mock("next/navigation", () => ({
    usePathname: () => "/",
    useRouter: () => ({ replace: vi.fn() }),
}));

function AuthQueryProvider({ children }: { children: ReactNode }) {
    return (
        <QueryProvider>
            <AuthInitializer />
            {children}
        </QueryProvider>
    );
}

const member = {
    memberId: 1,
    name: "테스트 회원",
    nickname: "닉네임",
    email: null,
    phone: null,
    profileImageUrl: null,
};

beforeEach(() => {
    memberMe.mockReset();
    memberMe.mockResolvedValue({ data: { success: true, data: member } });
    useAuthStore.setState({ accessToken: null, isLoggedIn: false, isInitialized: false });
});

it("waits for authentication and shares member data between consumers", async () => {
    const { result } = renderHook(() => [useMeQuery(), useMeQuery()], {
        wrapper: QueryProvider,
    });
    expect(memberMe).not.toHaveBeenCalled();
    act(() => useAuthStore.setState({ isInitialized: true }));
    expect(memberMe).not.toHaveBeenCalled();
    act(() => useAuthStore.setState({ accessToken: "token", isLoggedIn: true }));
    await waitFor(() => expect(result.current.every((query) => query.isSuccess)).toBe(true));
    expect(result.current[0].data).toEqual(member);
    expect(result.current[1].data).toEqual(member);
    expect(memberMe).toHaveBeenCalledTimes(1);
});

it("reports a business failure without changing login state", async () => {
    useAuthStore.setState({ accessToken: "token", isLoggedIn: true, isInitialized: true });
    memberMe.mockResolvedValue({ data: { success: false, message: "조회 실패", data: null } });
    const { result } = renderHook(() => useMeQuery(), { wrapper: QueryProvider });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("조회 실패");
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(memberMe).toHaveBeenCalledTimes(1);
});

it("clears cached member data on sign-out before another login", async () => {
    useAuthStore.setState({ accessToken: "token", isLoggedIn: true, isInitialized: true });
    const { result } = renderHook(() => ({ query: useMeQuery(), client: useQueryClient() }), {
        wrapper: AuthQueryProvider,
    });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    act(() => useAuthStore.setState({ accessToken: null, isLoggedIn: false }));
    expect(result.current.client.getQueryData(["member", "me"])).toBeUndefined();
    memberMe.mockResolvedValue({
        data: { success: true, data: { ...member, memberId: 2, name: "다른 회원" } },
    });
    act(() => useAuthStore.setState({ accessToken: "next-token", isLoggedIn: true }));
    await waitFor(() => expect(result.current.query.data?.name).toBe("다른 회원"));
});

it("cancels a pending member request when authentication expires", async () => {
    let requestSignal: AbortSignal | undefined;
    memberMe.mockImplementation((signal: AbortSignal) => {
        requestSignal = signal;
        return new Promise(() => {});
    });
    useAuthStore.setState({ accessToken: "token", isLoggedIn: true, isInitialized: true });
    const { result } = renderHook(() => ({ query: useMeQuery(), client: useQueryClient() }), {
        wrapper: AuthQueryProvider,
    });
    await waitFor(() => expect(memberMe).toHaveBeenCalledTimes(1));
    act(() => useAuthStore.setState({ accessToken: null, isLoggedIn: false }));
    expect(requestSignal?.aborted).toBe(true);
    expect(result.current.client.getQueryData(["member", "me"])).toBeUndefined();
});
