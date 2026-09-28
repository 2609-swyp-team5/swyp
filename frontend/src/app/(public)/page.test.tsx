import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/features/auth/store/authStore";
import AuthInitializer from "@/features/auth/components/AuthInitializer";

import OnboardingPage from "./page";

const mocks = vi.hoisted(() => ({ replace: vi.fn(), pathname: "/" }));

vi.mock("next/navigation", () => ({
    usePathname: () => mocks.pathname,
    useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/features/auth/api/authApi", () => ({
    authApi: { authLogin: vi.fn(), authLogout: vi.fn() },
}));

function renderWithQueryClient(children: ReactNode) {
    return render(<QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>);
}

function renderOnboarding() {
    return renderWithQueryClient(
        <>
            <AuthInitializer />
            <OnboardingPage />
        </>,
    );
}

describe("Onboarding page", () => {
    beforeEach(() => {
        mocks.replace.mockReset();
        mocks.pathname = "/";
        useAuthStore.setState({
            isLoggedIn: false,
            isInitialized: true,
            checkStatus: vi.fn().mockResolvedValue(undefined),
        });
    });

    it("provides an entry link to authentication", () => {
        renderOnboarding();

        expect(
            screen.getByRole("heading", { name: "지금 팔까, 더 갖고 있을까?" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "시작하기" })).toHaveAttribute("href", "/login");
        expect(screen.getByRole("link", { name: "지금 시작하기" })).toHaveAttribute(
            "href",
            "/login",
        );
        expect(mocks.replace).not.toHaveBeenCalled();
    });

    it("shows onboarding with a home link when logged in without redirecting", () => {
        useAuthStore.setState({ isLoggedIn: true });
        renderOnboarding();

        expect(screen.getByRole("main")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "시작하기" })).toHaveAttribute("href", "/home");
        expect(screen.getByRole("link", { name: "지금 시작하기" })).toHaveAttribute(
            "href",
            "/home",
        );
        expect(mocks.replace).not.toHaveBeenCalled();
    });

    it("shows onboarding after authentication recovery without redirecting", () => {
        useAuthStore.setState({ isInitialized: false });
        renderOnboarding();

        expect(screen.getByRole("main")).toBeInTheDocument();
        const startLink = screen.getByRole("link", { name: "시작하기" });
        expect(startLink).toHaveAttribute("aria-disabled", "true");
        expect(fireEvent.click(startLink)).toBe(false);
        expect(mocks.replace).not.toHaveBeenCalled();

        act(() => {
            useAuthStore.setState({ isLoggedIn: true, isInitialized: true });
        });

        expect(screen.getByRole("main")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "시작하기" })).toHaveAttribute("href", "/home");
        expect(screen.getByRole("link", { name: "시작하기" })).toHaveAttribute(
            "aria-disabled",
            "false",
        );
        expect(mocks.replace).not.toHaveBeenCalled();
    });

    it("still redirects guests from protected routes to login", () => {
        mocks.pathname = "/my/settings";
        renderWithQueryClient(<AuthInitializer />);

        expect(mocks.replace).toHaveBeenCalledWith("/login");
    });

    it("does not redirect logged-in users from home", () => {
        mocks.pathname = "/home";
        useAuthStore.setState({ isLoggedIn: true });
        renderWithQueryClient(<AuthInitializer />);

        expect(mocks.replace).not.toHaveBeenCalled();
    });
});
