import { expect, test, type Page } from "@playwright/test";

const loginRequest = { email: "login@example.com", password: " password1234 " };

const fillLoginForm = async (page: Page) => {
    await page.getByLabel("이메일", { exact: true }).fill(loginRequest.email);
    await page.getByLabel("비밀번호", { exact: true }).fill(loginRequest.password);
};

test("redirects after login and prevents returning to the login page", async ({ page }) => {
    let releaseResponse = () => {};
    const responseReady = new Promise<void>((resolve) => {
        releaseResponse = resolve;
    });
    await page.route("**/auth/login", async (route) => {
        await responseReady;
        await route.fulfill({
            status: 200,
            json: {
                success: true,
                message: "요청이 성공적으로 처리되었습니다.",
                data: { accessToken: "test-access-token" },
                error: null,
            },
        });
    });

    await page.goto("/login");
    await expect(page.locator("form input")).toHaveCount(2);
    await fillLoginForm(page);
    const requestPromise = page.waitForRequest("**/auth/login");
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    const request = await requestPromise;
    expect(request.method()).toBe("POST");
    expect(request.headers()["content-type"]).toContain("application/json");
    expect(request.postDataJSON()).toEqual(loginRequest);
    await expect(page.getByRole("button", { name: "로그인 중..." })).toBeDisabled();
    await expect(page.getByLabel("이메일", { exact: true })).toBeDisabled();
    releaseResponse();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("link", { name: "시작하기", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("heading", { name: "로그인", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => sessionStorage.getItem("accessToken"))).toBe(
        "test-access-token",
    );
    await page.reload();
    await page.getByRole("link", { name: "지금이니?", exact: true }).click();
    await page.getByRole("link", { name: "시작하기", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "로그인", exact: true })).toHaveCount(0);
});

test("forwards the form without client-side validation", async ({ page }) => {
    let requestBody: unknown;
    await page.route("**/auth/login", async (route) => {
        requestBody = route.request().postDataJSON();
        await route.fulfill({
            status: 401,
            json: {
                success: false,
                message: "이메일 또는 비밀번호가 일치하지 않습니다.",
                data: null,
                error: { status: "401", code: "UNAUTHORIZED", details: null },
            },
        });
    });
    await page.goto("/login");
    await page.getByRole("button", { name: "로그인", exact: true }).click();

    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
        "이메일 또는 비밀번호가 일치하지 않습니다.",
    );
    expect(requestBody).toEqual({ email: "", password: "" });
});

test("displays the backend login error and allows retrying", async ({ page }) => {
    await page.route("**/auth/login", (route) =>
        route.fulfill({
            status: 401,
            json: {
                success: false,
                message: "이메일 또는 비밀번호가 일치하지 않습니다.",
                data: null,
                error: { status: "401", code: "UNAUTHORIZED", details: null },
            },
        }),
    );
    await page.goto("/login");
    await fillLoginForm(page);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
        "이메일 또는 비밀번호가 일치하지 않습니다.",
    );
    await expect(page.getByRole("button", { name: "로그인", exact: true })).toBeEnabled();
    await expect(page.getByLabel("이메일", { exact: true })).toHaveValue(loginRequest.email);
    await expect(page.getByText("로그인에 성공했습니다.")).toHaveCount(0);
});
