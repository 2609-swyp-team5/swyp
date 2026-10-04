import { expect, test } from "./fixtures";
import { popularProducts } from "./home-product-fixture";

test("popular products load for guests and retry errors without showing sample cards", async ({
    page,
}) => {
    let fail = true;
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route("**/products/popular", async (route) => {
        expect(route.request().method()).toBe("GET");
        expect(route.request().headers().authorization).toBeUndefined();
        expect(new URL(route.request().url()).search).toBe("");
        if (fail) {
            await ready;
            return route.fulfill({
                status: 500,
                json: { success: false, message: "인기 상품 조회 실패", data: null, error: null },
            });
        }
        return route.fulfill({ json: { success: true, data: [popularProducts[0]], error: null } });
    });
    await page.goto("/home");
    await expect(page.getByRole("status", { name: "인기 상품을 불러오는 중" })).toBeVisible();
    release();
    await expect(page.locator("main").getByRole("alert")).toContainText("인기 상품 조회 실패");
    await expect(page.locator('[role="region"][aria-label="인기 상품 모음"]')).toHaveCount(0);
    fail = false;
    await page.getByRole("button", { name: "인기 상품 다시 조회" }).click();
    const carousel = page.locator('[role="region"][aria-label="인기 상품 모음"]');
    await expect(carousel.getByRole("heading", { name: "인기 상품 1", exact: true })).toBeVisible();
    await expect(
        carousel.getByRole("button", { name: "인기 상품 모음 다음", exact: true }),
    ).toBeDisabled();
    await expect(carousel.getByRole("button", { name: /페이지$/ })).toHaveCount(1);
});

test("an empty popular list displays an empty state", async ({ page }) => {
    await page.route("**/products/popular", (route) =>
        route.fulfill({ json: { success: true, data: [], error: null } }),
    );
    await page.goto("/home");
    await expect(page.getByText("아직 인기 상품이 없습니다.", { exact: true })).toBeVisible();
    await expect(page.locator('[role="region"][aria-label="인기 상품 모음"]')).toHaveCount(0);
});
