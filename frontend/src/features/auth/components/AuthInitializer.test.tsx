import { act, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";

import AuthInitializer from "./AuthInitializer";
import { useAuthStore } from "@/features/auth/store/authStore";

const navigation = vi.hoisted(() => ({ pathname: "/home", replace: vi.fn() }));
vi.mock("next/navigation", () => ({
    usePathname: () => navigation.pathname,
    useRouter: () => ({ replace: navigation.replace }),
}));
vi.mock("@/features/auth/api/authApi", () => ({ authApi: {} }));

beforeEach(() => {
    localStorage.clear();
    navigation.replace.mockClear();
    useAuthStore.setState({ accessToken: "token", isLoggedIn: true, isInitialized: true });
});

it.each(["/home", "/search", "/sell/manage", "/sell/register", "/buy/wishlist", "/notifications"])(
    "redirects to login when an authenticated session ends on %s",
    (pathname) => {
        navigation.pathname = pathname;
        render(
            <QueryClientProvider client={new QueryClient()}>
                <AuthInitializer />
            </QueryClientProvider>,
        );
        expect(navigation.replace).not.toHaveBeenCalled();
        act(() => useAuthStore.getState().clearAuth());
        expect(navigation.replace).toHaveBeenCalledWith("/login");
    },
);

it("does not redirect an initial guest on search", () => {
    navigation.pathname = "/search";
    useAuthStore.setState({ accessToken: null, isLoggedIn: false, isInitialized: true });
    render(
        <QueryClientProvider client={new QueryClient()}>
            <AuthInitializer />
        </QueryClientProvider>,
    );
    expect(navigation.replace).not.toHaveBeenCalled();
});
