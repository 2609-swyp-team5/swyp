import { expect, test } from "./fixtures";

test("search input toggles modes without suggestions or changing general search", async ({
    page,
}, testInfo) => {
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
    const general = form.getByRole("button", { name: "일반 검색", exact: true });
    const ai = form.getByRole("button", { name: "AI 검색", exact: true });
    await expect(general).toHaveAttribute("aria-pressed", "true");
    const toggle = form.getByRole("group", { name: "검색 모드", exact: true });
    const initialToggleWidth = (await toggle.boundingBox())?.width;
    await input.fill("아이폰 13 미니 128GB");
    await page.mouse.move(0, 0);
    await form.screenshot({ path: testInfo.outputPath("search-general-desktop.png") });
    await expect.poll(() => keywords.length).toBe(1);
    const initialRequests = keywords.length;
    await ai.click();
    await expect(ai).toHaveAttribute("aria-pressed", "true");
    await expect(general).toHaveAttribute("aria-pressed", "false");
    expect((await toggle.boundingBox())?.width).toBe(initialToggleWidth);
    expect((await ai.boundingBox())?.width).toBe((await general.boundingBox())?.width);
    await page.mouse.move(0, 0);
    await expect
        .poll(() => ai.evaluate((element) => getComputedStyle(element).backgroundColor))
        .toBe("rgb(102, 83, 251)");
    await expect
        .poll(() => ai.evaluate((element) => getComputedStyle(element).color))
        .toBe("rgb(255, 255, 255)");
    const suggestions = page.getByRole("group", { name: "AI 추천 질문", exact: true });
    await expect(suggestions).toHaveCount(0);
    await expect(input).toHaveAttribute("placeholder", "무엇이든 물어보세요");
    await form.screenshot({ path: testInfo.outputPath("search-ai-desktop.png") });
    expect(keywords).toHaveLength(initialRequests);
    await input.press("Escape");
    await general.click();
    await input.fill("아이패드 프로");
    await input.press("Enter");
    await expect.poll(() => keywords.includes("아이패드 프로")).toBe(true);
    await ai.click();
    await input.press("Escape");
    await expect(suggestions).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await general.click();
    await ai.click();
    await expect(suggestions).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
    );
    await page.screenshot({ path: testInfo.outputPath("search-ai-mobile.png") });
});
