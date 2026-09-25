import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            status: 200,
            json: { success: true, data: { accessToken: "password-change-token" }, error: null },
        }),
    );
});

test("validates passwords before sending a request", async ({ page }) => {
    let requests = 0;
    await page.route("**/users/password", (route) => {
        requests++;
        return route.abort();
    });
    await page.goto("/my/password");
    await page.getByRole("button", { name: "비밀번호 변경", exact: true }).click();
    await expect(page.getByText("기존 비밀번호를 입력해 주세요.", { exact: true })).toBeVisible();
    await page.getByLabel("기존 비밀번호", { exact: true }).fill("oldPassword1");
    await page.getByLabel("변경할 비밀번호", { exact: true }).fill("short");
    await page.getByRole("button", { name: "비밀번호 변경", exact: true }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText(
        "비밀번호는 영문과 숫자를 포함해 8~64자로 입력해 주세요.",
    );
    expect(requests).toBe(0);
});

test("submits passwords, blocks repeats and requests login after success", async ({ page }) => {
    let finishRequest!: () => void;
    const ready = new Promise<void>((resolve) => {
        finishRequest = resolve;
    });
    let requests = 0;
    await page.route("**/users/password", async (route) => {
        requests++;
        expect(route.request().method()).toBe("PATCH");
        expect(route.request().headers().authorization).toBe("Bearer password-change-token");
        expect(route.request().postDataJSON()).toEqual({
            currentPassword: " oldPassword1 ",
            newPassword: "newPassword2",
        });
        await ready;
        await route.fulfill({
            status: 200,
            json: { success: true, message: "변경 완료", data: null, error: null },
        });
    });
    await page.goto("/my/password");
    await page.getByLabel("기존 비밀번호", { exact: true }).fill(" oldPassword1 ");
    await page.getByLabel("변경할 비밀번호", { exact: true }).fill("newPassword2");
    await page.getByRole("button", { name: "변경할 비밀번호 표시", exact: true }).click();
    await expect(page.getByLabel("변경할 비밀번호", { exact: true })).toHaveAttribute(
        "type",
        "text",
    );
    await page.getByRole("button", { name: "비밀번호 변경", exact: true }).click();
    await expect(page.getByRole("button", { name: "변경 중...", exact: true })).toBeDisabled();
    finishRequest();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("비밀번호가 변경되었습니다.");
    await expect(page.getByLabel("기존 비밀번호", { exact: true })).toHaveValue("");
    await dialog.getByRole("button", { name: "확인", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(requests).toBe(1);
});

for (const failure of [
    { status: 400, message: "기존 비밀번호가 일치하지 않습니다." },
    { status: 200, message: "소셜 로그인 회원은 비밀번호를 변경할 수 없습니다." },
]) {
    test(`keeps authentication and shows failure: ${failure.message}`, async ({ page }) => {
        await page.route("**/users/password", (route) =>
            route.fulfill({
                status: failure.status,
                json: { success: false, message: failure.message, data: null, error: null },
            }),
        );
        await page.goto("/my/password");
        await page.getByLabel("기존 비밀번호", { exact: true }).fill("oldPassword1");
        await page.getByLabel("변경할 비밀번호", { exact: true }).fill("newPassword2");
        await page.getByRole("button", { name: "비밀번호 변경", exact: true }).click();
        await expect(page.getByRole("alertdialog")).toContainText(failure.message);
        await page
            .getByRole("alertdialog")
            .getByRole("button", { name: "확인", exact: true })
            .click();
        await expect(
            page.getByRole("button", { name: "비밀번호 변경", exact: true }),
        ).toBeEnabled();
        await expect(page).toHaveURL(/\/my\/password$/);
        await expect(
            page.getByRole("banner").getByRole("link", { name: "프로필", exact: true }),
        ).toBeVisible();
    });
}
