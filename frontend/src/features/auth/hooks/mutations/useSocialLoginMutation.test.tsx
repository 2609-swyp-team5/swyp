import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";

import { useSocialLoginMutation } from "./useSocialLoginMutation";
import { useAuthStore } from "@/features/auth/store/authStore";

const { authSocialLogin } = vi.hoisted(() => ({ authSocialLogin: vi.fn() }));
vi.mock("@/features/auth/api/authApi", () => ({ authApi: { authSocialLogin } }));

function setup() {
    const client = new QueryClient({ defaultOptions: { mutations: { gcTime: 0 } } });
    const onError = vi.fn();
    const hook = renderHook(() => useSocialLoginMutation({ onError }), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
    });
    return { ...hook, onError };
}

beforeEach(() => {
    authSocialLogin.mockReset();
    useAuthStore.setState({ accessToken: null, isLoggedIn: false, isInitialized: true });
});

it("sends the Google credential and stores the returned service token", async () => {
    authSocialLogin.mockResolvedValue({
        data: { success: true, data: { accessToken: "service-token" } },
    });
    const { result } = setup();
    await act(async () => {
        await result.current.mutateAsync({ provider: "GOOGLE", token: "google-credential" });
    });
    expect(authSocialLogin.mock.calls[0][0]).toEqual({
        provider: "GOOGLE",
        token: "google-credential",
    });
    expect(useAuthStore.getState()).toMatchObject({
        accessToken: "service-token",
        isLoggedIn: true,
    });
});

it("treats success false as a mutation failure without logging in", async () => {
    authSocialLogin.mockResolvedValue({
        data: { success: false, message: "Invalid Google token", data: null },
    });
    const { result, onError } = setup();
    act(() => result.current.mutate({ provider: "GOOGLE", token: "invalid" }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid Google token" }),
    );
    expect(authSocialLogin).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({ accessToken: null, isLoggedIn: false });
});

it("passes failure to the page callback without logging in or retrying", async () => {
    const error = new Error("Invalid Google token");
    authSocialLogin.mockRejectedValue(error);
    const { result, onError } = setup();
    act(() => result.current.mutate({ provider: "GOOGLE", token: "invalid" }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(onError).toHaveBeenCalledWith(error);
    expect(authSocialLogin).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({ accessToken: null, isLoggedIn: false });
});
