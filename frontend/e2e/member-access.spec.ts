import { test, expect } from "./fixtures";

const memberRoutes = [
    { path: "/sell/manage", title: "판매 상품 관리" },
    { path: "/sell/register/ai", title: "상품 사진을 올려주세요" },
    { path: "/buy/wishlist", title: "관심 상품" },
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
    await page
        .getByRole("banner")
        .getByRole("link", { name: "판매 상품 관리", exact: true })
        .click();
    await expect(page.getByRole("alertdialog", { name: "로그인이 필요합니다" })).toBeVisible();
});

const registerActions = [
    { action: "AI 등록 시작하기", path: "/sell/register/ai" },
    { action: "직접 등록 시작하기", path: "/sell/register/direct" },
] as const;

for (const { action, path } of registerActions) {
    test(`guests can browse /sell/register before logging in from ${action}`, async ({ page }) => {
        await page.goto("/sell/register");
        await expect(page.getByRole("heading", { name: "어떻게 등록할까요?" })).toBeVisible();
        const dialog = page.getByRole("alertdialog", { name: "로그인이 필요합니다" });
        await expect(dialog).toHaveCount(0);
        await page.getByRole("link", { name: action }).click();
        await expect(dialog).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`${path}$`));
        await dialog.getByRole("button", { name: "확인", exact: true }).click();
        await expect(page).toHaveURL(/\/login$/);
    });
}
