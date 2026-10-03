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
    let connectRequests = 0;
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
    await page.route("**/platforms/BUNJANG/connect", async (route) => {
        connectRequests++;
        expect(route.request().postDataJSON()).toEqual({ cookie: "test-bun-session" });
        if (connectRequests === 1)
            return route.fulfill({
                status: 400,
                json: {
                    success: false,
                    message: "번개장터 로그인 정보가 만료됐어요.",
                    data: null,
                    error: null,
                },
            });
        if (connectRequests === 2) await connectionReady;
        status = "CONNECTED";
        return route.fulfill({
            json: {
                success: true,
                data: { status, updatedAt: "2026-10-03T12:00:00" },
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
    await page.goto("/my/platforms");
    await expect(count("미연결")).toHaveText("1");
    await page.getByLabel("번개장터 연결 정보").fill("  test-bun-session  ");
    await page.getByRole("button", { name: "번개장터 연결", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: "연결하기", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText("번개장터 로그인 정보가 만료됐어요.");
    await expect(count("미연결")).toHaveText("1");
    await expect(count("연결됨")).toHaveText("0");
    await dialog.getByRole("button", { name: "연결하기", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "처리 중..." })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "취소", exact: true })).toBeDisabled();
    expect(connectRequests).toBe(2);
    releaseConnection();
    await expect(dialog).toHaveCount(0);
    await expect(count("연결됨")).toHaveText("1");
    await expect(page.getByLabel("번개장터 연결 정보")).toHaveCount(0);
    await page.reload();
    await expect(
        page.getByRole("button", { name: "번개장터 연결 해제", exact: true }),
    ).toBeVisible();
    status = "EXPIRED";
    await page.reload();
    await expect(count("만료됨")).toHaveText("1");
    await expect(count("연결됨")).toHaveText("0");
    const input = page.getByLabel("번개장터 연결 정보");
    await expect(input).toHaveValue("");
    await input.fill("test-bun-session");
    await page.getByRole("button", { name: "번개장터 다시 연결", exact: true }).click();
    await dialog.getByRole("button", { name: "연결하기", exact: true }).click();
    await expect(count("연결됨")).toHaveText("1");
    await page.getByRole("button", { name: "번개장터 연결 해제", exact: true }).click();
    await dialog.getByRole("button", { name: "연결 해제", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText("연결 해제에 실패했습니다.");
    await expect(count("연결됨")).toHaveText("1");
    await dialog.getByRole("button", { name: "연결 해제", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(count("미연결")).toHaveText("1");
    await expect(page.getByLabel("번개장터 연결 정보")).toHaveValue("");
    expect(connectRequests).toBe(3);
    expect(disconnectRequests).toBe(2);
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
