import { expect, test } from "./fixtures";

test("sidebar logout preserves the session on failure and clears it on success", async ({
    page,
}) => {
    let authenticated = true;
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            status: authenticated ? 200 : 401,
            json: {
                success: authenticated,
                data: authenticated ? { accessToken: "test-access-token" } : null,
                error: null,
            },
        }),
    );
    await page.goto("/my");

    const header = page.getByRole("banner");
    const menu = page.getByRole("navigation", { name: "마이페이지 메뉴" });
    await expect(menu.getByRole("button", { name: "로그아웃", exact: true })).toBeVisible();
    await expect(header.getByRole("button", { name: "로그인" })).toHaveCount(0);

    let shouldFail = true;
    await page.route("**/auth/logout", async (route) => {
        expect(route.request().method()).toBe("POST");
        expect(route.request().headers().authorization).toBe("Bearer test-access-token");
        if (!shouldFail) authenticated = false;
        await route.fulfill({
            status: shouldFail ? 500 : 200,
            json: {
                success: !shouldFail,
                message: shouldFail ? "로그아웃에 실패했습니다." : "성공적으로 로그아웃되었습니다.",
                data: null,
                error: null,
            },
        });
    });

    await menu.getByRole("button", { name: "로그아웃", exact: true }).click();
    await expect(menu.getByRole("alert")).toHaveText("로그아웃에 실패했습니다.");
    await expect(menu.getByRole("button", { name: "로그아웃", exact: true })).toBeVisible();
    await expect(header.getByRole("button", { name: "로그인" })).toHaveCount(0);

    shouldFail = false;
    await menu.getByRole("button", { name: "로그아웃", exact: true }).click();
    // /my는 로그인이 필요해 로그아웃에 성공하면 바로 로그인 화면으로 이동한다(로그인 화면 헤더에는 [로그인] 버튼이 없어
    // 헤더 버튼을 기다리면 이동 시점에 따라 실패한다)
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "로그인", exact: true })).toBeVisible();

    // 새로고침해도 세션이 돌아오지 않는다(재발급 401)
    await page.reload();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "로그인", exact: true })).toBeVisible();
});

test("clears the unread notification badge before guest onboarding", async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            status: 200,
            json: { success: true, data: { accessToken: "test-access-token" }, error: null },
        }),
    );
    await page.route("**/notifications/unread", (route) =>
        route.fulfill({
            status: 200,
            json: { success: true, data: { count: 3 }, error: null },
        }),
    );
    await page.goto("/home");

    await expect(page.getByRole("link", { name: "알림 3개 읽지 않은 알림" })).toBeVisible();

    await page.goto("/my");
    await page.route("**/auth/logout", (route) =>
        route.fulfill({
            status: 200,
            json: { success: true, message: "로그아웃 성공", data: null, error: null },
        }),
    );
    await page
        .getByRole("navigation", { name: "마이페이지 메뉴" })
        .getByRole("button", {
            name: "로그아웃",
            exact: true,
        })
        .click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/");
    await page.getByRole("link", { name: "시작하기", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByLabel("3개 읽지 않은 알림")).toHaveCount(0);
});
