import { expect, test } from "./fixtures";

test("logout survives closing a tab and synchronizes subsequent login across tabs", async ({
    context,
}) => {
    let refreshRequests = 0;
    await context.route("**/auth/refresh", async (route) => {
        refreshRequests += 1;
        await route.fulfill({ json: { success: true, data: { accessToken: "test-token" } } });
    });
    await context.route("**/users/me", (route) =>
        route.fulfill({
            json: { success: true, data: { memberId: 1, nickname: "민준", profileImageUrl: null } },
        }),
    );
    await context.route("**/auth/logout", (route) =>
        route.fulfill({ json: { success: true, data: null } }),
    );
    await context.route("**/auth/login", (route) =>
        route.fulfill({ json: { success: true, data: { accessToken: "new-token" } } }),
    );

    const first = await context.newPage();
    const second = await context.newPage();
    await first.goto("/my");
    await second.goto("/home");
    await expect(
        second.getByRole("banner").getByRole("link", { name: "프로필", exact: true }),
    ).toBeVisible();
    expect(refreshRequests).toBe(2);
    await first.getByRole("button", { name: "로그아웃", exact: true }).click();
    await expect(first).toHaveURL(/\/login$/);
    await expect(
        second.getByRole("banner").getByRole("button", { name: "로그인", exact: true }),
    ).toBeVisible();
    await first.close();

    const reopened = await context.newPage();
    await reopened.goto("/home");
    await expect(
        reopened.getByRole("banner").getByRole("button", { name: "로그인", exact: true }),
    ).toBeVisible();
    await reopened.reload();
    await expect(
        reopened.getByRole("banner").getByRole("button", { name: "로그인", exact: true }),
    ).toBeVisible();
    expect(refreshRequests).toBe(2);

    await reopened.goto("/login");
    await reopened.getByLabel("이메일", { exact: true }).fill("login@example.com");
    await reopened.getByLabel("비밀번호", { exact: true }).fill("password1234");
    await reopened.locator('button[form="login-form"]').click();
    await expect(reopened).toHaveURL(/\/home$/);
    await expect(
        second.getByRole("banner").getByRole("link", { name: "프로필", exact: true }),
    ).toBeVisible();
    expect(await reopened.evaluate(() => localStorage.getItem("auth:loggedOut"))).toBeNull();
    expect(refreshRequests).toBe(3);
    await reopened.reload();
    await expect(
        reopened.getByRole("banner").getByRole("link", { name: "프로필", exact: true }),
    ).toBeVisible();
    expect(refreshRequests).toBe(4);
});
