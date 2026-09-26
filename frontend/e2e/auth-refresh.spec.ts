import { expect, test } from "./fixtures";

for (const refreshSucceeds of [true, false]) {
    test(`logout handles expired access tokens when refresh ${refreshSucceeds ? "succeeds" : "fails"}`, async ({
        page,
    }) => {
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
            const restoring = refreshCount === 1;
            const success = restoring || refreshSucceeds;
            await route.fulfill({
                status: success ? 200 : 401,
                json: {
                    success,
                    data: success
                        ? { accessToken: restoring ? "expired-token" : "fresh-token" }
                        : null,
                    message: "Refresh failed",
                    error: null,
                },
            });
        });
        await page.goto("/my");
        await expect(
            page.getByRole("heading", { name: "안녕하세요, 민준님", exact: true }),
        ).toBeVisible();
        await page
            .getByRole("navigation", { name: "마이페이지 메뉴" })
            .getByRole("button", { name: "로그아웃", exact: true })
            .click();
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole("heading", { name: "로그인", exact: true })).toBeVisible();
        expect(refreshCount).toBe(2);
        expect(logoutCount).toBe(refreshSucceeds ? 2 : 1);
    });
}
