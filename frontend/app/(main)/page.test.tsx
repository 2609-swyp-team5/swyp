import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home page", () => {
    it("shows the getting-started message and documentation link", () => {
        render(<Home />);

        expect(screen.getByRole("heading", { name: /to get started/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Documentation" })).toHaveAttribute(
            "href",
            expect.stringContaining("nextjs.org/docs"),
        );
    });
});
