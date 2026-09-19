import { expect, test } from "@playwright/test";

test("hides the profile link before login", async ({ page }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "로그인", exact: true })).toBeVisible();
    await expect(header.getByRole("link", { name: "프로필", exact: true })).toHaveCount(0);
});

for (const path of ["/my", "/my/settings"]) {
    test(`redirects unauthenticated visits from ${path} to login`, async ({ page }) => {
        await page.goto(path);
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole("heading", { name: "로그인", exact: true })).toBeVisible();
        await expect(page.getByRole("navigation", { name: "마이페이지 메뉴" })).toHaveCount(0);
    });
}

test("restores my page access on reload and redirects after logout", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => sessionStorage.setItem("accessToken", "test-access-token"));
    await page.goto("/my");

    const header = page.getByRole("banner");
    const profile = header.getByRole("link", { name: "프로필", exact: true });
    await expect(profile).toBeVisible();
    await expect(page.getByRole("heading", { name: "마이페이지", exact: true })).toBeVisible();
    expect(await profile.evaluate((element) => element.nextElementSibling?.textContent)).toBe(
        "로그아웃",
    );

    await page.reload();
    await expect(page.getByRole("heading", { name: "마이페이지", exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/my$/);

    await page.route("**/auth/logout", (route) =>
        route.fulfill({
            status: 200,
            json: { success: true, message: "로그아웃 성공", data: null, error: null },
        }),
    );
    await header.getByRole("button", { name: "로그아웃", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(profile).toHaveCount(0);
});
