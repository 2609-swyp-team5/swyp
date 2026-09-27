import { expect, test } from "./fixtures";

const savedEmailKey = "savedLoginEmail";
const email = "remember@example.com";

test("saves only the email after successful login and restores it in a new tab", async ({
    page,
}) => {
    await page.route("**/auth/login", (route) =>
        route.fulfill({
            status: 200,
            json: { success: true, data: { accessToken: "test-token" } },
        }),
    );
    await page.goto("/login");
    await expect(page.getByRole("checkbox", { name: "아이디 저장" })).not.toBeChecked();
    await page.getByLabel("이메일", { exact: true }).fill(email);
    await page.getByLabel("비밀번호", { exact: true }).fill("password1234");
    await page.getByRole("checkbox", { name: "아이디 저장" }).check();
    expect(await page.evaluate((key) => localStorage.getItem(key), savedEmailKey)).toBeNull();
    await page.locator('button[form="login-form"]').click();
    await expect(page).toHaveURL(/\/home$/);
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual({ [savedEmailKey]: email });

    const nextPage = await page.context().newPage();
    await nextPage.route("**/auth/refresh", (route) =>
        route.fulfill({ status: 401, json: { success: false } }),
    );
    await page.close();
    await nextPage.goto("/login");
    await expect(nextPage.getByLabel("이메일", { exact: true })).toHaveValue(email);
    await expect(nextPage.getByLabel("비밀번호", { exact: true })).toHaveValue("");
    await expect(nextPage.getByRole("checkbox", { name: "아이디 저장" })).toBeChecked();
    await nextPage.getByRole("checkbox", { name: "아이디 저장" }).uncheck();
    expect(await nextPage.evaluate((key) => localStorage.getItem(key), savedEmailKey)).toBeNull();
    await nextPage.reload();
    await expect(nextPage.getByLabel("이메일", { exact: true })).toHaveValue("");
    await expect(nextPage.getByRole("checkbox", { name: "아이디 저장" })).not.toBeChecked();
    await nextPage.close();
});

test("does not save an email when login fails", async ({ page }) => {
    await page.route("**/auth/login", (route) =>
        route.fulfill({ status: 401, json: { success: false, message: "로그인 실패" } }),
    );
    await page.goto("/login");
    await page.getByLabel("이메일", { exact: true }).fill(email);
    await page.getByLabel("비밀번호", { exact: true }).fill("password1234");
    await page.getByRole("checkbox", { name: "아이디 저장" }).check();
    await page.locator('button[form="login-form"]').click();
    const dialog = page.getByRole("alertdialog", { name: "로그인 오류" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("로그인 실패");
    expect(await page.evaluate((key) => localStorage.getItem(key), savedEmailKey)).toBeNull();
    await dialog.getByRole("button", { name: "확인", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByLabel("이메일", { exact: true })).toHaveValue(email);
    await page.locator('button[form="login-form"]').click();
    await expect(dialog).toBeVisible();
});

test("does not save an email when the checkbox is unchecked", async ({ page }) => {
    await page.route("**/auth/login", (route) =>
        route.fulfill({
            status: 200,
            json: { success: true, data: { accessToken: "test-token" } },
        }),
    );
    await page.goto("/login");
    await page.getByLabel("이메일", { exact: true }).fill(email);
    await page.getByLabel("비밀번호", { exact: true }).fill("password1234");
    await page.locator('button[form="login-form"]').click();
    await expect(page).toHaveURL(/\/home$/);
    expect(await page.evaluate((key) => localStorage.getItem(key), savedEmailKey)).toBeNull();
});
