import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OnboardingPage from "./page";

describe("Onboarding page", () => {
    it("provides an entry link to authentication", () => {
        render(<OnboardingPage />);

        expect(
            screen.getByRole("heading", { name: "지금 팔까, 더 갖고 있을까?" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "시작하기" })).toHaveAttribute("href", "/login");
    });
});
