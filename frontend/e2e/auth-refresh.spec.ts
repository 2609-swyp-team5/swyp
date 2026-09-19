import { expect, test } from "@playwright/test";

for (const refreshSucceeds of [true, false]) {
    test(`logout handles expired access tokens when refresh ${refreshSucceeds ? "succeeds" : "fails"}`, async ({
        page,
    }) => {
        await page.goto("/");
        await page.evaluate(() => sessionStorage.setItem("accessToken", "expired-token"));
        await page.goto("/my");
        let logoutCount = 0;
        let refreshCount = 0;
        await page.route("**/auth/logout", async (route) => {
            logoutCount++;
            expect(route.request().headers().authorization).toBe(
                logoutCount === 1 ? "Bearer expired-token" : "Bearer fresh-token",
            );
            await route.fulfill({
                status: logoutCount === 1 ? 401 : 200,
                json: { success: logoutCount > 1, data: null, error: null },
            });
        });
        await page.route("**/auth/refresh", async (route) => {
            refreshCount++;
            await route.fulfill({
                status: refreshSucceeds ? 200 : 401,
                json: {
                    success: refreshSucceeds,
                    data: refreshSucceeds ? { accessToken: "fresh-token" } : null,
                    message: "Refresh failed",
                    error: null,
                },
            });
        });
        await page
            .getByRole("banner")
            .getByRole("button", { name: "로그아웃", exact: true })
            .click();
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole("heading", { name: "로그인", exact: true })).toBeVisible();
        expect(await page.evaluate(() => sessionStorage.getItem("accessToken"))).toBeNull();
        expect(refreshCount).toBe(1);
        expect(logoutCount).toBe(refreshSucceeds ? 2 : 1);
    });
}
