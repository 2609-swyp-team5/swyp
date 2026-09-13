import { expect, test } from "@playwright/test";

test("homepage shows the getting-started content", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Create Next App");
    await expect(page.getByRole("heading", { name: /to get started/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Documentation" })).toHaveAttribute(
        "href",
        /nextjs\.org\/docs/,
    );
});
