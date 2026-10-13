import { expect, test } from "./fixtures";

test("search bar has no AI toggle and submits a general search", async ({ page }, testInfo) => {
    const keywords: (string | null)[] = [];
    await page.route("**/products?*", (route) => {
        keywords.push(new URL(route.request().url()).searchParams.get("keyword"));
        return route.fulfill({
            json: {
                success: true,
                data: { content: [], nextCursor: null, hasNext: false },
                error: null,
            },
        });
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/search");
    const form = page.getByRole("search");
    const input = form.getByRole("textbox", { name: "상품 검색", exact: true });
    await expect(form.getByRole("group", { name: "검색 모드" })).toHaveCount(0);
    await expect(form.getByRole("button", { name: "AI 검색" })).toHaveCount(0);
    await expect(input).toHaveAttribute("placeholder", "상품을 검색해 보세요");
    await expect.poll(() => keywords.length).toBe(1);
    await input.fill("아이패드 프로");
    await form.getByRole("button", { name: "검색", exact: true }).click();
    await expect.poll(() => keywords.includes("아이패드 프로")).toBe(true);
    await form.screenshot({ path: testInfo.outputPath("search-bar-desktop.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
    );
});
