import { expect, test } from "./fixtures";

test("validates email and sends the reset request once while pending", async ({ page }) => {
    let requestCount = 0;
    let release = () => {};
    const ready = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route("**/auth/password/reset", async (route) => {
        requestCount += 1;
        expect(route.request().method()).toBe("POST");
        expect(route.request().postDataJSON()).toEqual({ email: "reset@example.com" });
        await ready;
        await route.fulfill({
            status: 200,
            json: { success: true, message: "비밀번호 재설정 메일을 발송했습니다.", data: null },
        });
    });
    await page.goto("/login");
    await page.getByRole("button", { name: "비밀번호 찾기", exact: true }).click();
    const dialog = page.getByRole("dialog");
    const input = dialog.getByLabel("가입 이메일 주소");
    const submit = dialog.getByRole("button", { name: "재설정 링크 보내기" });
    await submit.click();
    await expect(page.locator("#password-reset-error")).toHaveText("이메일을 입력해 주세요.");
    await input.fill("invalid-email");
    await submit.click();
    await expect(page.locator("#password-reset-error")).toHaveText(
        "올바른 이메일 형식을 입력해 주세요.",
    );
    expect(requestCount).toBe(0);
    await input.fill("reset@example.com");
    await input.press("Enter");
    await expect(dialog.getByRole("button", { name: "전송 중..." })).toBeDisabled();
    await expect(input).toBeDisabled();
    await expect.poll(() => requestCount).toBe(1);
    release();
    const successDialog = page.getByRole("alertdialog", { name: "재설정 메일 요청 완료" });
    await expect(successDialog).toBeVisible();
    await expect(successDialog).toContainText("비밀번호 재설정 메일을 발송했습니다.");
    await successDialog.getByRole("button", { name: "확인", exact: true }).click();
    await expect(successDialog).toHaveCount(0);
    await expect(submit).toBeEnabled();
    await dialog.getByRole("button", { name: "취소", exact: true }).click();
    await page.getByRole("button", { name: "비밀번호 찾기", exact: true }).click();
    await expect(input).toHaveValue("");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
});

for (const status of [500, 200]) {
    test(`shows reset failure and supports retry for HTTP ${status}`, async ({ page }) => {
        let requestCount = 0;
        await page.route("**/auth/password/reset", (route) => {
            requestCount += 1;
            return route.fulfill({
                status,
                json: { success: false, message: "메일 발송에 실패했습니다.", data: null },
            });
        });
        await page.goto("/login");
        await page.getByRole("button", { name: "비밀번호 찾기", exact: true }).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByLabel("가입 이메일 주소").fill("reset@example.com");
        const submit = dialog.getByRole("button", { name: "재설정 링크 보내기" });
        await submit.click();
        await expect(
            dialog.getByRole("alert").filter({ hasText: "메일 발송에 실패했습니다." }),
        ).toBeVisible();
        await expect(page.getByRole("alertdialog")).toHaveCount(0);
        await expect(submit).toBeEnabled();
        expect(requestCount).toBe(1);
        await submit.click();
        await expect.poll(() => requestCount).toBe(2);
    });
}
