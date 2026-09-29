import { test, expect } from "./fixtures";

const memberRoutes = [
    { path: "/sell/manage", title: "판매 상품 관리" },
    { path: "/sell/register", title: "상품 등록" },
    { path: "/buy/wishlist", title: "구매 관심상품" },
    { path: "/notifications", title: "알림" },
];

for (const { path, title } of memberRoutes) {
    test(`guests must confirm the login notice before using ${path}`, async ({ page }) => {
        await page.goto(path);
        const dialog = page.getByRole("alertdialog", { name: "로그인이 필요합니다" });
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText("로그인 후 사용해 주세요.");
        await expect(page).toHaveURL(new RegExp(`${path}$`));
        await expect(page.getByRole("heading", { name: title, exact: true })).toHaveCount(0);
        await dialog.getByRole("button", { name: "확인", exact: true }).click();
        await expect(page).toHaveURL(/\/login$/);
        await expect(dialog).toHaveCount(0);
    });

    test(`members can access ${path} without a login notice`, async ({ page }) => {
        await page.route("**/auth/refresh", (route) =>
            route.fulfill({ json: { success: true, data: { accessToken: "member-token" } } }),
        );
        await page.goto(path);
        await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
        await expect(page.getByRole("alertdialog")).toHaveCount(0);
    });
}

test("a guest header menu opens the same login notice", async ({ page }) => {
    await page.goto("/home");
    await page.getByRole("banner").getByRole("link", { name: "상품 등록", exact: true }).click();
    await expect(page.getByRole("alertdialog", { name: "로그인이 필요합니다" })).toBeVisible();
});

test("expired authenticated requests on search redirect to login after refresh fails", async ({
    page,
}) => {
    let refreshRequests = 0;
    await page.route("**/auth/refresh", (route) => {
        refreshRequests += 1;
        return route.fulfill({
            status: refreshRequests === 1 ? 200 : 401,
            json: {
                success: refreshRequests === 1,
                data: refreshRequests === 1 ? { accessToken: "expired-token" } : null,
            },
        });
    });
    await page.route("**/products?*", (route) => {
        const keyword = new URL(route.request().url()).searchParams.get("keyword");
        return route.fulfill({
            status: keyword ? 401 : 200,
            json: {
                success: !keyword,
                data: keyword ? null : { content: [], nextCursor: null, hasNext: false },
            },
        });
    });
    await page.goto("/search");
    await expect(
        page.getByRole("banner").getByRole("link", { name: "프로필", exact: true }),
    ).toBeVisible();
    await page.getByRole("textbox", { name: "상품 검색" }).fill("expired");
    await page.getByRole("search").getByRole("button", { name: "검색", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(refreshRequests).toBe(2);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
});
