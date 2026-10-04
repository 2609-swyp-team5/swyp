import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PlatformShortcutDialog } from "./PlatformShortcutDialog";

describe("PlatformShortcutDialog", () => {
    it("uses the existing Bunjang platform image", async () => {
        const user = userEvent.setup();

        render(
            <PlatformShortcutDialog
                product={{
                    platforms: [
                        {
                            platform: "번개장터",
                            platformName: "번개장터",
                            status: "POSTED",
                            productUrl: "https://m.bunjang.co.kr/products/437356002",
                        },
                    ],
                }}
            />,
        );

        await user.click(screen.getByRole("button", { name: "바로가기" }));

        const image = document.querySelector('img[src*="bunjang.png"]');
        expect(image).not.toBeNull();
        expect(image?.getAttribute("src")).toContain("bunjang.png");
    });
});
