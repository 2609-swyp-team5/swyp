import { test, expect } from "./fixtures";

const memberRoutes = [
    { path: "/sell/manage", title: "판매 상품 관리" },
    { path: "/sell/register", title: "어떻게 등록할까요?" },
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
