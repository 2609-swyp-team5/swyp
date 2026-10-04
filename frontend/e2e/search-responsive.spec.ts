import { expect, test } from "./fixtures";

test("small-screen header menus expand, close with Escape and navigate", async ({
    page,
}, testInfo) => {
    await page.route("**/products?*", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: { content: [], nextCursor: null, hasNext: false, totalCount: 0 },
                error: null,
            },
        }),
    );
    await page.goto("/search");
    for (const width of [320, 390, 768]) {
        await page.setViewportSize({ width, height: 900 });
        const toggle = page.getByRole("button", { name: "메뉴 열기", exact: true });
        await toggle.click();
        const menu = page.getByRole("navigation", { name: "모바일 주요 메뉴" });
        await expect(menu.getByRole("link")).toHaveCount(6);
        await expect(menu.getByRole("link", { name: "검색", exact: true })).toHaveAttribute(
            "aria-current",
            "page",
        );
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true,
        );
        await page
            .getByRole("banner")
            .screenshot({ path: testInfo.outputPath(`header-${width}.png`) });
        await menu.getByRole("link", { name: "검색", exact: true }).focus();
        await page.keyboard.press("Escape");
        await expect(toggle).toBeFocused();
        await expect(menu).toBeHidden();
    }
    await page.getByRole("button", { name: "메뉴 열기", exact: true }).click();
    await page
        .getByRole("navigation", { name: "모바일 주요 메뉴" })
        .getByRole("link", { name: "검색", exact: true })
        .click();
    await expect(page.getByRole("button", { name: "메뉴 열기", exact: true })).toHaveAttribute(
        "aria-expanded",
        "false",
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(
        page.getByRole("navigation", { name: "주요 메뉴", exact: true }).getByRole("link"),
    ).toHaveCount(6);
    await expect(page.getByRole("button", { name: "메뉴 열기", exact: true })).toBeHidden();
});

test("responsive filters retain selection and request conditions after collapsing", async ({
    page,
}, testInfo) => {
    const requests: URL[] = [];
    await page.route("**/products?*", (route) => {
        requests.push(new URL(route.request().url()));
        return route.fulfill({
            json: {
                success: true,
                data: { content: [], nextCursor: null, hasNext: false, totalCount: 0 },
                error: null,
            },
        });
    });
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/search");
    const filters = page.getByRole("complementary", { name: "검색 필터" });
    const toggle = filters.getByRole("button", { name: /검색 필터/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(filters.getByRole("checkbox", { name: "번개장터", exact: true })).toBeHidden();
    await toggle.click();
    await filters.getByRole("checkbox", { name: "번개장터", exact: true }).check();
    await filters.getByRole("checkbox", { name: "판매중", exact: true }).check();
    await filters.getByRole("radio", { name: "10만 원 이하", exact: true }).check();
    await expect
        .poll(() =>
            requests.some(
                (url) =>
                    url.searchParams.get("platform") === "BUNJANG" &&
                    url.searchParams.get("status") === "ON_SALE" &&
                    url.searchParams.get("maxPrice") === "100000",
            ),
        )
        .toBe(true);
    for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true,
        );
        await filters.screenshot({ path: testInfo.outputPath(`filters-${width}.png`) });
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("heading", { name: "전체 상품", exact: true })).toBeVisible();
    await toggle.click();
    await expect(filters.getByRole("checkbox", { name: "번개장터", exact: true })).toBeChecked();
    await expect(filters.getByRole("checkbox", { name: "판매중", exact: true })).toBeChecked();
});
