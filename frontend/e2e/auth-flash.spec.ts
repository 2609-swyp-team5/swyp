import { expect, test } from "./fixtures";

test("does not render the login form before login restoration", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
        const page = await context.newPage();
        await page.goto("/login");
        await expect(page.locator("form")).toHaveCount(0);
        await page.goto("/my");
        await expect(page.getByRole("navigation", { name: "마이페이지 메뉴" })).toHaveCount(0);
    } finally {
        await context.close();
    }
});

test("never inserts the login form while redirecting a restored session", async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            status: 200,
            json: { success: true, data: { accessToken: "test-access-token" }, error: null },
        }),
    );
    await page.addInitScript(() => {
        const detectForm = () => {
            if (location.pathname === "/login" && document.querySelector("form")) {
                sessionStorage.setItem("login-form-flashed", "true");
            }
        };
        new MutationObserver(detectForm).observe(document, { childList: true, subtree: true });
    });
    await page.goto("/login");
    await expect(page).toHaveURL(/\/home$/);
    expect(await page.evaluate(() => sessionStorage.getItem("login-form-flashed"))).toBeNull();
});
