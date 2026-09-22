import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

const signupRequest = {
    email: "signup@example.com",
    phone: "01012345678",
    password: "password1234",
    name: "홍길동",
    nickname: "길동",
};

test.beforeEach(async ({ page }) => {
    await page.route("**/auth/email/check?**", (route) =>
        route.fulfill({ status: 200, json: { success: true, data: { available: true } } }),
    );
});

async function fillRequiredFields(page: Page) {
    await page.getByLabel("이메일", { exact: true }).fill(signupRequest.email);
    await page.getByLabel("비밀번호", { exact: true }).fill(signupRequest.password);
    await page.getByLabel("이름", { exact: true }).fill(signupRequest.name);
    await page.getByLabel("닉네임", { exact: true }).fill(signupRequest.nickname);
    await page.getByRole("button", { name: "중복 확인", exact: true }).click();
    await expect(page.locator("#email-check-status")).toBeVisible();
}

for (const phone of [signupRequest.phone, null]) {
    test(`submits five signup fields with ${phone ? "a phone number" : "no phone number"}`, async ({
        page,
    }, testInfo) => {
        if (!phone) await page.setViewportSize({ width: 390, height: 844 });
        const pageErrors: string[] = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        let releaseResponse = () => {};
        const responseReady = new Promise<void>((resolve) => {
            releaseResponse = resolve;
        });
        await page.route("**/auth/signup", async (route) => {
            await responseReady;
            await route.fulfill({
                status: 201,
                json: {
                    success: true,
                    message: "요청이 성공적으로 처리되었습니다.",
                    data: {
                        memberId: 1,
                        email: signupRequest.email,
                        nickname: signupRequest.nickname,
                    },
                    error: null,
                },
            });
        });

        await page.goto("/signup");
        await expect(page.getByRole("heading", { name: "회원가입" })).toBeVisible();
        await expect(page.locator("form input")).toHaveCount(5);
        await page.screenshot({ path: testInfo.outputPath("signup-form.png"), fullPage: true });
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        await fillRequiredFields(page);
        if (phone) await page.getByLabel("휴대폰 번호 (선택)", { exact: true }).fill(phone);

        const requestPromise = page.waitForRequest("**/auth/signup");
        await page.locator('button[form="signup-form"]').click();
        const request = await requestPromise;
        expect(request.method()).toBe("POST");
        expect(request.headers()["content-type"]).toContain("application/json");
        expect(request.postDataJSON()).toEqual({ ...signupRequest, phone });
        await expect(page.getByRole("button", { name: "가입 중..." })).toBeDisabled();
        await expect(page.getByLabel("이메일", { exact: true })).toBeDisabled();
        releaseResponse();
        const dialog = page.getByRole("alertdialog", { name: "회원가입 완료" });
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText("회원가입이 완료되었습니다. 로그인해 주세요.");
        await expect(page).toHaveURL(/\/signup$/);
        await expect(page.locator("form")).toHaveCount(1);
        await expect(page.getByLabel("이메일", { exact: true })).toHaveValue("");
        await dialog.getByRole("button", { name: "확인", exact: true }).click();
        await expect(page).toHaveURL(/\/login$/);
        expect(pageErrors).toEqual([]);
    });
}

test("blocks empty signup fields before sending a request", async ({ page }) => {
    let requestBody: unknown;
    await page.route("**/auth/signup", async (route) => {
        requestBody = route.request().postDataJSON();
        await route.fulfill({
            status: 400,
            json: {
                success: false,
                message: "입력값이 올바르지 않습니다.",
                data: null,
                error: { status: "400", code: "INVALID_INPUT_VALUE", details: null },
            },
        });
    });
    await page.goto("/signup");
    await page.locator('button[form="signup-form"]').click();

    await expect(page.locator("#name-error")).toHaveText("이름을 입력해 주세요.");
    await expect(page.locator("#nickname-error")).toHaveText("닉네임을 입력해 주세요.");
    await expect(page.locator("#email-error")).toHaveText("이메일을 입력해 주세요.");
    await expect(page.locator("#password-error")).toHaveText("비밀번호를 입력해 주세요.");
    expect(requestBody).toBeUndefined();
});

test("shows the backend signup error and allows correcting the form", async ({ page }) => {
    await page.route("**/auth/signup", (route) =>
        route.fulfill({
            status: 409,
            json: {
                success: false,
                message: "이미 사용 중인 이메일입니다.",
                data: null,
                error: { status: "409", code: "CONFLICT", details: null },
            },
        }),
    );
    await page.goto("/signup");
    await fillRequiredFields(page);
    await page.locator('button[form="signup-form"]').click();
    const dialog = page.getByRole("alertdialog", { name: "회원가입 오류" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("이미 사용 중인 이메일입니다.");
    await dialog.getByRole("button", { name: "확인", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('button[form="signup-form"]')).toBeEnabled();
    await expect(page.getByLabel("이메일", { exact: true })).toHaveValue(signupRequest.email);
    await page.getByLabel("이메일", { exact: true }).fill("another@example.com");
    await expect(page.getByLabel("이메일", { exact: true })).toHaveValue("another@example.com");
    await expect(page.getByText("회원가입이 완료되었습니다.")).toHaveCount(0);
    await page.getByRole("button", { name: "중복 확인", exact: true }).click();
    await expect(page.locator("#email-check-status")).toBeVisible();
    await page.locator('button[form="signup-form"]').click();
    await expect(dialog).toBeVisible();
});

test("blocks invalid signup values before sending a request", async ({ page }) => {
    let requestCount = 0;
    await page.route("**/auth/signup", (route) => {
        requestCount += 1;
        return route.fulfill({ status: 400, json: { success: false } });
    });
    await page.goto("/signup");
    await fillRequiredFields(page);
    const cases = [
        { field: "email", value: "invalid-email", valid: signupRequest.email },
        { field: "name", value: "   ", valid: signupRequest.name },
        { field: "name", value: "가".repeat(51), valid: signupRequest.name },
        { field: "nickname", value: "   ", valid: signupRequest.nickname },
        { field: "nickname", value: "가".repeat(31), valid: signupRequest.nickname },
        { field: "phone", value: "010-1234-5678", valid: "" },
        { field: "password", value: "abc1234", valid: signupRequest.password },
        { field: "password", value: "abcdefgh", valid: signupRequest.password },
        { field: "password", value: "12345678", valid: signupRequest.password },
        { field: "password", value: "a1" + "a".repeat(63), valid: signupRequest.password },
    ];
    for (const { field, value, valid } of cases) {
        await page.locator(`#${field}`).fill(value);
        await page.locator('button[form="signup-form"]').click();
        await expect(page.locator(`#${field}-error`)).toBeVisible();
        await expect(page.locator(`#${field}`)).toHaveAttribute("aria-invalid", "true");
        expect(requestCount).toBe(0);
        await page.locator(`#${field}`).fill(valid);
    }
});

test("validates the email before checking and blocks duplicate emails", async ({ page }) => {
    const checkedEmails: string[] = [];
    let signupCount = 0;
    await page.route("**/auth/email/check?**", (route) => {
        checkedEmails.push(new URL(route.request().url()).searchParams.get("email") ?? "");
        return route.fulfill({ status: 200, json: { success: true, data: { available: false } } });
    });
    await page.route("**/auth/signup", (route) => {
        signupCount += 1;
        return route.fulfill({ status: 400, json: { success: false } });
    });
    await page.goto("/signup");
    await page.getByRole("button", { name: "중복 확인", exact: true }).click();
    await expect(page.locator("#email-error")).toHaveText("이메일을 입력해 주세요.");
    await page.locator("#email").fill("invalid-email");
    await page.getByRole("button", { name: "중복 확인", exact: true }).click();
    await expect(page.locator("#email-error")).toHaveText("올바른 이메일 형식을 입력해 주세요.");
    expect(checkedEmails).toEqual([]);
    await page.locator("#email").fill(signupRequest.email);
    await page.locator("#name").fill(signupRequest.name);
    await page.locator("#nickname").fill(signupRequest.nickname);
    await page.locator("#password").fill(signupRequest.password);
    await page.locator('button[form="signup-form"]').click();
    await expect(page.locator("#email-error")).toHaveText("이메일 중복 확인을 해 주세요.");
    await page.getByRole("button", { name: "중복 확인", exact: true }).click();
    await expect(page.locator("#email-error")).toHaveText("이미 사용 중인 이메일입니다.");
    expect(checkedEmails).toEqual([signupRequest.email]);
    await page.locator('button[form="signup-form"]').click();
    await expect(page.locator("#email-error")).toBeVisible();
    expect(signupCount).toBe(0);
});

test("invalidates email approval after editing and allows retrying failed checks", async ({
    page,
}) => {
    await page.goto("/signup");
    await fillRequiredFields(page);
    await page.locator("#email").fill("another@example.com");
    await expect(page.locator("#email-check-status")).toHaveCount(0);
    await page.locator('button[form="signup-form"]').click();
    await expect(page.locator("#email-error")).toHaveText("이메일 중복 확인을 해 주세요.");
    await page.route("**/auth/email/check?**", (route) =>
        route.fulfill({
            status: 500,
            json: { success: false, message: "중복 확인에 실패했습니다." },
        }),
    );
    await page.getByRole("button", { name: "중복 확인", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("중복 확인에 실패했습니다.");
    await dialog.getByRole("button", { name: "확인", exact: true }).click();
    await page.route("**/auth/email/check?**", (route) =>
        route.fulfill({ status: 200, json: { success: true, data: { available: true } } }),
    );
    await page.getByRole("button", { name: "중복 확인", exact: true }).click();
    await expect(page.locator("#email-check-status")).toBeVisible();
});
