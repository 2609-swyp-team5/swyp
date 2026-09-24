import { expect, test } from "./fixtures";

test("validates both passwords, toggles visibility, and confirms the reset token", async ({
    page,
}) => {
    let requestCount = 0;
    await page.route("**/auth/password/reset", (route) => {
        requestCount += 1;
        expect(route.request().method()).toBe("PATCH");
        expect(route.request().postDataJSON()).toEqual({
            resetToken: "reset-token",
            newPassword: "password123",
        });
        return route.fulfill({
            status: 200,
            json: {
                success: requestCount > 1,
                message:
                    requestCount > 1
                        ? "비밀번호가 재설정되었습니다."
                        : "유효하지 않거나 만료된 재설정 토큰입니다.",
                data: null,
            },
        });
    });

    await page.goto("/account/reset-password?token=reset-token");
    const password = page.getByLabel("새 비밀번호", { exact: true });
    const confirmation = page.getByLabel("새 비밀번호 확인", { exact: true });
    const submit = page.getByRole("button", { name: "비밀번호 재설정", exact: true });

    await expect(password).toHaveAttribute("type", "password");
    await expect(confirmation).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "새 비밀번호 표시", exact: true }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(confirmation).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "새 비밀번호 확인 표시", exact: true }).click();
    await expect(confirmation).toHaveAttribute("type", "text");

    await password.fill("password123");
    await confirmation.fill("different123");
    await submit.click();
    await expect(page.locator("#confirm-password-error")).toHaveText(
        "비밀번호가 일치하지 않습니다.",
    );
    expect(requestCount).toBe(0);

    await confirmation.fill("password123");
    await submit.click();
    await expect(
        page.getByRole("alert").filter({ hasText: "유효하지 않거나 만료된" }),
    ).toBeVisible();
    expect(requestCount).toBe(1);

    await submit.click();
    const success = page.getByRole("alertdialog", { name: "비밀번호 재설정 완료" });
    await expect(success).toBeVisible();
    expect(requestCount).toBe(2);
    await success.getByRole("button", { name: "로그인으로 이동" }).click();
    await expect(page).toHaveURL(/\/login$/);
});

test("does not submit without a token", async ({ page }) => {
    let requestCount = 0;
    await page.route("**/auth/password/reset", (route) => {
        requestCount += 1;
        return route.abort();
    });

    await page.goto("/account/reset-password");
    await page.getByLabel("새 비밀번호", { exact: true }).fill("password123");
    await page.getByLabel("새 비밀번호 확인", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "비밀번호 재설정", exact: true }).click();
    await expect(
        page.getByRole("alert").filter({ hasText: "재설정 링크가 올바르지 않습니다." }),
    ).toBeVisible();
    expect(requestCount).toBe(0);
});
