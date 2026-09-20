import { expect, test } from "./fixtures";

test("header logout preserves the session on failure and clears it on success", async ({
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
    await page.goto("/");

    const header = page.getByRole("banner");
    await expect(header.getByRole("button", { name: "로그아웃", exact: true })).toBeVisible();
    await expect(header.getByRole("link", { name: "로그인" })).toHaveCount(0);

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

    await header.getByRole("button", { name: "로그아웃", exact: true }).click();
    await expect(header.getByRole("alert")).toHaveText("로그아웃에 실패했습니다.");
    await expect(header.getByRole("button", { name: "로그아웃", exact: true })).toBeVisible();
    await expect(header.getByRole("link", { name: "로그인" })).toHaveCount(0);

    shouldFail = false;
    await header.getByRole("button", { name: "로그아웃", exact: true }).click();
    await expect(header.getByRole("link", { name: "로그인" })).toBeVisible();
    await expect(header.getByRole("button", { name: "로그아웃", exact: true })).toHaveCount(0);
    await expect(header.getByRole("alert")).toHaveCount(0);

    await page.reload();
    await header.getByRole("link", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "로그인", exact: true })).toBeVisible();
});
