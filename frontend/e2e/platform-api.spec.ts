import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "platform-test" }, error: null },
        }),
    );
});

test("platform connection preserves failures, blocks duplicates and reflects server expiration", async ({
    page,
}) => {
    let status = "DISCONNECTED";
    let verificationRequests = 0;
    let confirmRequests = 0;
    let disconnectRequests = 0;
    let releaseConnection!: () => void;
    const connectionReady = new Promise<void>((resolve) => {
        releaseConnection = resolve;
    });
    await page.route(
        (url) => url.pathname === "/platforms",
        (route) =>
            route.fulfill({
                json: {
                    success: true,
                    data: [
                        { platform: "BUNJANG", platformName: "번개장터", status, updatedAt: null },
                    ],
                    error: null,
                },
            }),
    );
    await page.route("**/platforms/BUNJANG/verification", async (route) => {
        verificationRequests++;
        expect(route.request().postDataJSON()).toEqual({
            name: "홍길동",
            birthDate: "900101",
            genderDigit: "1",
            carrier: "SKT",
            phone: "01012345678",
            agreedToBunjangTerms: true,
        });
        if (verificationRequests === 1)
            return route.fulfill({
                status: 400,
                json: {
                    success: false,
                    message: "인증 문자 요청에 실패했습니다.",
                    data: null,
                    error: null,
                },
            });
        return route.fulfill({
            json: {
                success: true,
                data: { verificationId: "verification-1", expiresInSeconds: 180 },
                error: null,
            },
        });
    });
    await page.route("**/platforms/BUNJANG/verification/*/confirm", async (route) => {
        confirmRequests++;
        expect(route.request().postDataJSON()).toEqual({ otp: "123456" });
        if (confirmRequests === 1) await connectionReady;
        status = "CONNECTED";
        return route.fulfill({
            json: {
                success: true,
                data: {
                    status,
                    updatedAt: "2026-10-03T12:00:00",
                    newBunjangAccount: true,
                },
                error: null,
            },
        });
    });
    await page.route("**/platforms/BUNJANG", (route) => {
        disconnectRequests++;
        expect(route.request().method()).toBe("DELETE");
        if (disconnectRequests === 1)
            return route.fulfill({
                status: 500,
                json: {
                    success: false,
                    message: "연결 해제에 실패했습니다.",
                    data: null,
                    error: null,
                },
            });
        status = "DISCONNECTED";
        return route.fulfill({ json: { success: true, data: null, error: null } });
    });
    const count = (label: string) =>
        page.getByText(label, { exact: true }).locator("..").locator("p").first();
    const fillVerificationForm = async (dialog: ReturnType<typeof page.getByRole>) => {
        await dialog.getByLabel("이름", { exact: true }).fill("홍길동");
        await dialog.getByLabel("생년월일", { exact: true }).fill("900101");
        await dialog.getByLabel("주민등록번호 뒷자리 첫 숫자", { exact: true }).fill("1");
        await dialog.getByRole("combobox", { name: "통신사" }).click();
        await page.getByRole("option", { name: "SKT", exact: true }).click();
        await dialog.getByLabel("휴대폰 번호", { exact: true }).fill("01012345678");
        await dialog.getByLabel("번개장터 본인인증 필수 약관에 동의합니다.").check();
    };
    await page.goto("/my/platforms");
    await expect(count("미연결")).toHaveText("1");
    await page.getByRole("button", { name: "번개장터 연결", exact: true }).click();
    let dialog = page.getByRole("dialog");
    await fillVerificationForm(dialog);
    await dialog.getByRole("button", { name: "인증 문자 받기", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText("인증 문자 요청에 실패했습니다.");
    await expect(count("미연결")).toHaveText("1");
    await expect(count("연결됨")).toHaveText("0");
    await dialog.getByRole("button", { name: "인증 문자 받기", exact: true }).click();
    await dialog.getByRole("button", { name: "인증번호 다시 받기", exact: true }).click();
    await expect(dialog.getByLabel("인증번호", { exact: true })).toHaveValue("");
    await expect(dialog.getByLabel("이름", { exact: true })).toHaveCount(0);
    await dialog.getByLabel("인증번호", { exact: true }).fill("123456");
    await dialog.getByRole("button", { name: "인증번호 확인", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "확인 중..." })).toBeDisabled();
    expect(verificationRequests).toBe(3);
    expect(confirmRequests).toBe(1);
    releaseConnection();
    await expect(dialog).toHaveCount(0);
    await expect(count("연결됨")).toHaveText("1");
    await page.reload();
    await expect(
        page.getByRole("button", { name: "번개장터 연결 해제", exact: true }),
    ).toBeVisible();
    status = "EXPIRED";
    await page.reload();
    await expect(count("만료됨")).toHaveText("1");
    await expect(count("연결됨")).toHaveText("0");
    await page.getByRole("button", { name: "번개장터 다시 연결", exact: true }).click();
    dialog = page.getByRole("dialog");
    await fillVerificationForm(dialog);
    await dialog.getByRole("button", { name: "인증 문자 받기", exact: true }).click();
    await dialog.getByLabel("인증번호", { exact: true }).fill("123456");
    await dialog.getByRole("button", { name: "인증번호 확인", exact: true }).click();
    await expect(count("연결됨")).toHaveText("1");
    await page.getByRole("button", { name: "번개장터 연결 해제", exact: true }).click();
    dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: "연결 해제", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText("연결 해제에 실패했습니다.");
    await expect(count("연결됨")).toHaveText("1");
    await dialog.getByRole("button", { name: "연결 해제", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(count("미연결")).toHaveText("1");
    expect(verificationRequests).toBe(4);
    expect(confirmRequests).toBe(2);
    expect(disconnectRequests).toBe(2);
});

test("platform verification stays open when confirmation expires", async ({ page }) => {
    await page.route(
        (url) => url.pathname === "/platforms",
        (route) =>
            route.fulfill({
                json: {
                    success: true,
                    data: [
                        {
                            platform: "BUNJANG",
                            platformName: "번개장터",
                            status: "DISCONNECTED",
                            updatedAt: null,
                        },
                    ],
                    error: null,
                },
            }),
    );
    await page.route("**/platforms/BUNJANG/verification", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: { verificationId: "expired-verification", expiresInSeconds: 180 },
                error: null,
            },
        }),
    );
    await page.route("**/platforms/BUNJANG/verification/*/confirm", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: { status: "EXPIRED", updatedAt: null, newBunjangAccount: false },
                error: null,
            },
        }),
    );

    await page.goto("/my/platforms");
    await page.getByRole("button", { name: "번개장터 연결", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("이름", { exact: true }).fill("홍길동");
    await dialog.getByLabel("생년월일", { exact: true }).fill("900101");
    await dialog.getByLabel("주민등록번호 뒷자리 첫 숫자", { exact: true }).fill("1");
    await dialog.getByRole("combobox", { name: "통신사" }).click();
    await page.getByRole("option", { name: "SKT", exact: true }).click();
    await dialog.getByLabel("휴대폰 번호", { exact: true }).fill("01012345678");
    await dialog.getByLabel("번개장터 본인인증 필수 약관에 동의합니다.").check();
    await dialog.getByRole("button", { name: "인증 문자 받기", exact: true }).click();
    await dialog.getByLabel("인증번호", { exact: true }).fill("123456");
    await dialog.getByRole("button", { name: "인증번호 확인", exact: true }).click();

    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("alert")).toHaveText(
        "인증번호가 만료되었습니다. 인증번호를 다시 요청해 주세요.",
    );
});

test("platform list failure can be retried without displaying preview cards", async ({ page }) => {
    let attempts = 0;
    await page.route(
        (url) => url.pathname === "/platforms",
        (route) => {
            attempts++;
            return attempts === 1
                ? route.fulfill({
                      status: 500,
                      json: {
                          success: false,
                          message: "연동 목록 조회 실패",
                          data: null,
                          error: null,
                      },
                  })
                : route.fulfill({
                      json: {
                          success: true,
                          data: [
                              {
                                  platform: "BUNJANG",
                                  platformName: "번개장터",
                                  status: "DISCONNECTED",
                                  updatedAt: null,
                              },
                          ],
                          error: null,
                      },
                  });
        },
    );
    await page.goto("/my/platforms");
    await expect(page.getByRole("main").getByRole("alert")).toContainText("연동 목록 조회 실패");
    await expect(page.getByRole("button", { name: "번개장터 연결", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "다시 시도", exact: true }).click();
    await expect(page.getByRole("button", { name: "번개장터 연결", exact: true })).toBeVisible();
    expect(attempts).toBe(2);
});
