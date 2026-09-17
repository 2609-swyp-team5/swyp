import { expect, test, type Page } from "@playwright/test";

const signupRequest = {
    email: "signup@example.com",
    phone: "01012345678",
    password: "password1234",
    name: "홍길동",
    nickname: "길동",
};

async function fillRequiredFields(page: Page) {
    await page.getByLabel("이메일", { exact: true }).fill(signupRequest.email);
    await page.getByLabel("비밀번호", { exact: true }).fill(signupRequest.password);
    await page.getByLabel("이름", { exact: true }).fill(signupRequest.name);
    await page.getByLabel("닉네임", { exact: true }).fill(signupRequest.nickname);
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
        await page.getByRole("button", { name: "회원가입", exact: true }).click();
        const request = await requestPromise;
        expect(request.method()).toBe("POST");
        expect(request.headers()["content-type"]).toContain("application/json");
        expect(request.postDataJSON()).toEqual({ ...signupRequest, phone });
        await expect(page.getByRole("button", { name: "가입 중..." })).toBeDisabled();
        await expect(page.getByLabel("이메일", { exact: true })).toBeDisabled();
        releaseResponse();
        await expect(page.getByRole("status")).toHaveText("회원가입이 완료되었습니다.");
        await expect(page.locator("form")).toHaveCount(1);
        await expect(page.getByLabel("이메일", { exact: true })).toHaveValue("");
        expect(pageErrors).toEqual([]);
    });
}

test("forwards the form without client-side validation", async ({ page }) => {
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
    await page.getByRole("button", { name: "회원가입", exact: true }).click();

    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
        "입력값이 올바르지 않습니다.",
    );
    expect(requestBody).toEqual({
        name: "",
        nickname: "",
        phone: null,
        email: "",
        password: "",
    });
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
    await page.getByRole("button", { name: "회원가입", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
        "이미 사용 중인 이메일입니다.",
    );
    await expect(page.getByRole("button", { name: "회원가입", exact: true })).toBeEnabled();
    await expect(page.getByLabel("이메일", { exact: true })).toHaveValue(signupRequest.email);
    await page.getByLabel("이메일", { exact: true }).fill("another@example.com");
    await expect(page.getByLabel("이메일", { exact: true })).toHaveValue("another@example.com");
    await expect(page.getByText("회원가입이 완료되었습니다.")).toHaveCount(0);
});
