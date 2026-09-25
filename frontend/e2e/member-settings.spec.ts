import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            status: 200,
            json: { success: true, data: { accessToken: "settings-token" }, error: null },
        }),
    );
});

test("validates member fields and preserves edits after a failed save", async ({ page }) => {
    let requests = 0;
    await page.route("**/users/me", (route) => {
        if (route.request().method() !== "PATCH") return route.fallback();
        requests++;
        expect(route.request().postDataJSON()).toEqual({ nickname: "변경 닉네임", phone: null });
        return route.fulfill({
            status: 200,
            json: { success: false, message: "저장할 수 없습니다.", data: null, error: null },
        });
    });
    await page.goto("/my/settings");
    const nickname = page.getByLabel("이름 (닉네임)");
    await expect(nickname).toHaveValue("민준");
    await nickname.fill(" ");
    await page.getByRole("button", { name: "변경 사항 저장" }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText("닉네임을 입력해 주세요.");
    expect(requests).toBe(0);
    await nickname.fill("변경 닉네임");
    await page.getByLabel("휴대폰 번호").fill("123");
    await page.getByRole("button", { name: "변경 사항 저장" }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText(
        "올바른 휴대폰 번호를 입력해 주세요.",
    );
    expect(requests).toBe(0);
    await page.getByLabel("휴대폰 번호").fill("");
    await page.getByRole("button", { name: "변경 사항 저장" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("저장할 수 없습니다.");
    await page.getByRole("alertdialog").getByRole("button", { name: "확인", exact: true }).click();
    await expect(nickname).toHaveValue("변경 닉네임");
    await expect(page.locator("aside").getByText("민준", { exact: true })).toBeVisible();
});

test("does not submit a blank profile when loading fails", async ({ page }) => {
    await page.route("**/users/me", (route) =>
        route.fulfill({
            status: 500,
            json: { success: false, message: "조회 실패", data: null, error: null },
        }),
    );
    await page.goto("/my/settings");
    await expect(page.getByRole("alertdialog")).toContainText("조회 실패");
    await page.getByRole("alertdialog").getByRole("button", { name: "확인", exact: true }).click();
    await expect(page.getByRole("button", { name: "변경 사항 저장" })).toBeDisabled();
});
