import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/features/auth/store/authStore";

import OnboardingPage from "./page";

vi.mock("@/features/auth/api/authApi", () => ({
    authApi: { authLogin: vi.fn(), authLogout: vi.fn() },
}));

describe("Onboarding page", () => {
    beforeEach(() => {
        useAuthStore.setState({ isLoggedIn: false });
    });

    it("provides an entry link to authentication", () => {
        render(<OnboardingPage />);

        expect(
            screen.getByRole("heading", { name: "지금 팔까, 더 갖고 있을까?" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "시작하기" })).toHaveAttribute("href", "/login");
    });

    it("provides an entry link to home when logged in", () => {
        useAuthStore.setState({ isLoggedIn: true });
        render(<OnboardingPage />);

        expect(screen.getByRole("link", { name: "시작하기" })).toHaveAttribute("href", "/home");
    });
});
