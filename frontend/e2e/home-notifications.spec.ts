import { test, expect } from "./fixtures";
import { popularProducts } from "./home-product-fixture";

test.beforeEach(async ({ page }) => {
    await page.route("**/products/popular", (route) =>
        route.fulfill({ json: { success: true, data: popularProducts, error: null } }),
    );
});

test("guest home publishes the shared design and forwards search keywords", async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/home");
    await expect(page.getByRole("banner").getByRole("button", { name: "로그인" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "상품 일반 검색" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "인기 상품 모음", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "안녕하세요", exact: false })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "내 물건 추천", exact: true })).toHaveCount(0);
    await expect(page.getByText("지금, 타이밍을 확인해보세요.", { exact: true })).toHaveCount(0);
    const carousel = page.locator('[role="region"][aria-label="인기 상품 모음"]');
    await expect(carousel.getByRole("heading", { name: "인기 상품 1", exact: true })).toBeVisible();
    await expect(carousel.getByRole("link", { name: "인기 상품 1 상세보기" })).toHaveAttribute(
        "href",
        "/search/701",
    );
    await expect(carousel.getByRole("img", { name: "인기 상품 1", exact: true })).toBeVisible();
    await expect(carousel).toContainText("10,000원");
    await expect(carousel).toContainText("판매완료");
    await expect(carousel).toContainText("비교 데이터 부족");
    await expect(carousel.getByRole("button", { name: /페이지$/ })).toHaveCount(4);
    const favorite = carousel.getByRole("button", {
        name: "인기 상품 모음 인기 상품 1 관심 상품",
        exact: true,
    });
    await favorite.click();
    await expect(page.getByRole("alertdialog")).toContainText("로그인 후 사용해 주세요.");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(favorite).toHaveAttribute("aria-pressed", "false");
    await expect(favorite.locator("svg")).toHaveAttribute("fill", "none");
    await carousel.getByRole("button", { name: "인기 상품 모음 다음", exact: true }).click();
    await expect(carousel.getByRole("button", { name: "인기 상품 모음 2페이지" })).toHaveAttribute(
        "aria-current",
        "page",
    );
    await page.screenshot({ path: testInfo.outputPath("guest-home-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(carousel.getByRole("button", { name: /페이지$/ })).toHaveCount(10);
    await carousel.getByRole("button", { name: "인기 상품 모음 10페이지", exact: true }).click();
    await expect(
        carousel.getByRole("heading", { name: "인기 상품 10", exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
    );
    await page.screenshot({ path: testInfo.outputPath("guest-home-mobile.png"), fullPage: true });
    const requests: string[] = [];
    await page.route("**/products?*", (route) => {
        requests.push(route.request().url());
        return route.fulfill({
            json: {
                success: true,
                data: { content: [], nextCursor: null, hasNext: false },
                error: null,
            },
        });
    });
    await page.getByRole("textbox", { name: "홈 상품 검색어" }).fill("필름카메라");
    await page.getByRole("button", { name: "상품 검색", exact: true }).click();
    await expect(page).toHaveURL(/\/search\?keyword=/);
    await expect
        .poll(() =>
            requests.some((url) => new URL(url).searchParams.get("keyword") === "필름카메라"),
        )
        .toBe(true);
});

test("signed-in home adds the greeting, summary and recommendations", async ({
    page,
}, testInfo) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "home-preview" }, error: null },
        }),
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/home");
    await expect(page.getByRole("heading", { name: "안녕하세요, 김민준님" })).toBeVisible();
    await expect(
        page.getByRole("region", { name: "나의 거래 요약" }).locator('[data-slot="card"]'),
    ).toHaveCount(4);
    await expect(page.getByRole("heading", { name: "내 물건 추천", exact: true })).toBeVisible();
    await expect(
        page.getByRole("link", { name: "판매 상품 등록하기", exact: true }),
    ).toHaveAttribute("href", "/sell/register");
    await page.screenshot({ path: testInfo.outputPath("member-home-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
    );
});

test("notifications filter their preview list and keep navigation working", async ({
    page,
}, testInfo) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "notifications-preview" }, error: null },
        }),
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/notifications");
    await expect(page.getByRole("heading", { name: "알림", exact: true })).toBeVisible();
    const main = page.getByRole("main");
    await expect(main.locator('[data-slot="card"]')).toHaveCount(5);
    await main.getByRole("button", { name: "구매추천 2", exact: true }).click();
    await expect(main.locator('[data-slot="card"]')).toHaveCount(2);
    await expect(main.getByRole("heading", { name: "다이슨 에어랩 시세 하락 중" })).toBeVisible();
    await main.getByRole("button", { name: "전체 5", exact: true }).click();
    await page.screenshot({
        path: testInfo.outputPath("notifications-desktop.png"),
        fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
    );
    await page.screenshot({
        path: testInfo.outputPath("notifications-mobile.png"),
        fullPage: true,
    });
    await main.getByRole("button", { name: "연동 1", exact: true }).click();
    await expect(main.locator('[data-slot="card"]')).toHaveCount(1);
    await expect(main.getByRole("link", { name: "다시 연결", exact: true })).toHaveAttribute(
        "href",
        "/my/platforms",
    );
});
