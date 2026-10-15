import { expect, test } from "./fixtures";

test("phones use the bottom tab bar and tablets use the header menu", async ({
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
    const tabBar = page.getByRole("navigation", { name: "하단 메뉴" });
    const toggle = page.getByRole("button", { name: "메뉴 열기", exact: true });
    for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(tabBar.getByRole("link")).toHaveCount(5);
        await expect(tabBar.getByRole("link", { name: "검색", exact: true })).toHaveAttribute(
            "aria-current",
            "page",
        );
        await expect(toggle).toBeHidden();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true,
        );
        await page.screenshot({ path: testInfo.outputPath(`tab-bar-${width}.png`) });
    }

    await page.setViewportSize({ width: 768, height: 900 });
    await expect(tabBar).toBeHidden();
    await toggle.click();
    const menu = page.getByRole("navigation", { name: "모바일 주요 메뉴" });
    await expect(menu.getByRole("link")).toHaveCount(7);
    await expect(menu.getByRole("link", { name: "검색", exact: true })).toHaveAttribute(
        "aria-current",
        "page",
    );
    await menu.getByRole("link", { name: "검색", exact: true }).focus();
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(menu).toBeHidden();
    await toggle.click();
    await menu.getByRole("link", { name: "검색", exact: true }).click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(
        page.getByRole("navigation", { name: "주요 메뉴", exact: true }).getByRole("link"),
    ).toHaveCount(7);
    await expect(toggle).toBeHidden();
    await expect(tabBar).toBeHidden();
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
    // 휴대폰은 하단 시트라 "결과 보기"로 닫는다.
    await filters.getByRole("button", { name: "결과 보기", exact: true }).click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("heading", { name: "전체 상품", exact: true })).toBeVisible();
    await toggle.click();
    await expect(filters.getByRole("checkbox", { name: "번개장터", exact: true })).toBeChecked();
    await expect(filters.getByRole("checkbox", { name: "판매중", exact: true })).toBeChecked();
});
