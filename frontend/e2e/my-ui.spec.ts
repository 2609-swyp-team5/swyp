import { expect, test } from "./fixtures";

type ProductStatus = "DRAFT" | "ON_SALE" | "SOLD_OUT";

const productSummary = (id: number, status: ProductStatus, title = "상품") => ({
    id,
    title,
    brand: null,
    price: 10000,
    status,
    condition: "A",
    defectStatus: "NORMAL",
    purchasedMonths: null,
    categoryName: "디지털",
    thumbnailUrl: null,
    recommendation: null,
    marketAveragePrice: null,
    createdAt: "2026-10-03T00:00:00Z",
});

test.beforeEach(async ({ page }) => {
    await page.route("**/products/me?*", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: {
                    content: [],
                    nextCursor: null,
                    hasNext: false,
                    totalCount: 0,
                    statusCounts: { DRAFT: 0, ON_SALE: 0, SOLD_OUT: 0 },
                },
                error: null,
            },
        }),
    );
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            status: 200,
            json: { success: true, data: { accessToken: "my-ui-preview" }, error: null },
        }),
    );
});

test("my pages share navigation and fit a mobile content area", async ({ page }) => {
    const routes = [
        ["/my", "안녕하세요, 민준님"],
        ["/my/settings", "사용자 정보 설정"],
        ["/my/password", "비밀번호 변경"],
        ["/my/notifications", "알림 설정"],
        ["/my/products", "등록된 상품 확인"],
        ["/my/platforms", "플랫폼 별 연동 확인"],
        ["/my/withdraw", "회원 탈퇴"],
    ];
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [path, title] of routes) {
        await page.goto(path);
        await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
        const main = page.locator("main");
        expect(await main.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
            true,
        );
        await expect(
            page
                .getByRole("navigation", { name: "마이페이지 메뉴" })
                .getByRole("link", { name: "비밀번호 변경" }),
        ).toHaveAttribute("href", "/my/password");
        await expect(
            page
                .getByRole("navigation", { name: "마이페이지 메뉴" })
                .getByRole("button", { name: "로그아웃", exact: true }),
        ).toBeVisible();
    }
});

test("home greets the member returned by the API", async ({ page }) => {
    await page.route("**/users/me", (route) =>
        route.fulfill({
            status: 200,
            json: {
                success: true,
                data: {
                    memberId: 2,
                    name: "이서연",
                    nickname: "다른 닉네임",
                    email: null,
                    phone: null,
                    profileImageUrl: null,
                },
                error: null,
            },
        }),
    );
    await page.goto("/my");
    await expect(
        page.getByRole("heading", { name: "안녕하세요, 다른 닉네임님", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "등록한 물건" })).toBeVisible();
    await expect(page.locator("aside").getByText("다른 닉네임", { exact: true })).toBeVisible();
});

test("home product summary shows total and all status counts from cursor pages", async ({
    page,
}, testInfo) => {
    let finishRequest!: () => void;
    const responseReady = new Promise<void>((resolve) => {
        finishRequest = resolve;
    });
    const requests: URLSearchParams[] = [];
    await page.route("**/products/me?*", async (route) => {
        expect(route.request().headers().authorization).toBe("Bearer my-ui-preview");
        const params = new URL(route.request().url()).searchParams;
        requests.push(params);
        await responseReady;
        const isNext = params.has("cursor");
        const statuses: ProductStatus[] = isNext
            ? ["DRAFT", "SOLD_OUT"]
            : ["DRAFT", "ON_SALE", "ON_SALE"];
        return route.fulfill({
            json: {
                success: true,
                data: {
                    content: statuses.map((status, index) =>
                        productSummary((isNext ? 10 : 20) - index, status),
                    ),
                    nextCursor: isNext ? null : "18",
                    hasNext: !isNext,
                    totalCount: 5,
                    statusCounts: { DRAFT: 2, ON_SALE: 2, SOLD_OUT: 1 },
                },
                error: null,
            },
        });
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/my");
    const card = page
        .locator("article")
        .filter({ has: page.getByRole("heading", { name: "등록한 물건", exact: true }) });
    await expect(card.getByRole("status")).toHaveText("상품을 불러오는 중입니다.");
    finishRequest();
    await expect(card).toContainText("5개");
    await expect(card).toContainText("등록됨 2 · 판매중 2 · 판매완료 1");
    expect(requests).toHaveLength(2);
    expect(requests.every((params) => !params.has("status"))).toBe(true);
    expect(requests[1]?.get("cursor")).toBe("18");
    for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
            true,
        );
        await card.screenshot({ path: testInfo.outputPath(`home-summary-${width}.png`) });
    }
});

test("home product summary retries errors and displays zero counts", async ({ page }) => {
    let attempts = 0;
    await page.route("**/products/me?*", (route) =>
        route.fulfill({
            json:
                ++attempts === 1
                    ? { success: false, message: "상품 조회 실패", data: null, error: null }
                    : {
                          success: true,
                          data: {
                              content: [],
                              nextCursor: null,
                              hasNext: false,
                              totalCount: 0,
                              statusCounts: { DRAFT: 0, ON_SALE: 0, SOLD_OUT: 0 },
                          },
                          error: null,
                      },
        }),
    );
    await page.goto("/my");
    const card = page
        .locator("article")
        .filter({ has: page.getByRole("heading", { name: "등록한 물건", exact: true }) });
    await expect(card.getByRole("alert")).toHaveText("상품 조회 실패");
    await card.getByRole("button", { name: "다시 시도", exact: true }).click();
    await expect(card).toContainText("0개");
    await expect(card).toContainText("등록됨 0 · 판매중 0 · 판매완료 0");
    expect(attempts).toBe(2);
});

test("profile saves member fields and updates shared nickname", async ({ page }) => {
    await page.route("**/users/me", (route) => {
        if (route.request().method() !== "PATCH") return route.fallback();
        expect(route.request().postDataJSON()).toEqual({
            nickname: "새 닉네임",
            phone: "01012345678",
        });
        return route.fulfill({
            status: 200,
            json: {
                success: true,
                data: {
                    memberId: 1,
                    name: "김민준",
                    nickname: "새 닉네임",
                    email: "minjun.kim@example.com",
                    phone: "01012345678",
                    profileImageUrl: null,
                },
                error: null,
            },
        });
    });
    await page.goto("/my/settings");
    await expect(page.getByLabel("이름 (닉네임)")).toHaveValue("민준");
    await page.getByLabel("이름 (닉네임)").fill("새 닉네임");
    await page.getByLabel("휴대폰 번호").fill("010-1234-5678");
    await expect(page.getByLabel("이메일", { exact: true })).toHaveAttribute("readonly", "");
    await page.getByRole("button", { name: "변경 사항 저장" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("변경 사항이 적용되었습니다.");
    await page.getByRole("alertdialog").getByRole("button", { name: "확인", exact: true }).click();
    await expect(page.locator("aside").getByText("새 닉네임", { exact: true })).toBeVisible();
    await page
        .getByRole("navigation", { name: "마이페이지 메뉴" })
        .getByRole("link", { name: "홈", exact: true })
        .click();
    await expect(
        page.getByRole("heading", { name: "안녕하세요, 새 닉네임님", exact: true }),
    ).toBeVisible();
});

test("notification switches respond to keyboard input", async ({ page }) => {
    await page.goto("/my/notifications");
    const toggle = page.getByRole("switch", { name: "AI 추천 타이밍 알림", exact: true });
    await expect(toggle).toBeChecked();
    await toggle.focus();
    await page.keyboard.press("Space");
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await expect(toggle).toBeChecked();
});

test("product filters count all pages and switch locally without requests", async ({ page }) => {
    const requests: URLSearchParams[] = [];
    await page.route("**/products/me?*", (route) => {
        expect(route.request().headers().authorization).toBe("Bearer my-ui-preview");
        const params = new URL(route.request().url()).searchParams;
        requests.push(params);
        const isNext = params.has("cursor");
        const statuses: ProductStatus[] = isNext ? ["DRAFT"] : ["DRAFT", "ON_SALE", "SOLD_OUT"];
        return route.fulfill({
            json: {
                success: true,
                data: {
                    content: statuses.map((status, index) => ({
                        ...productSummary((isNext ? 10 : 20) - index, status, `${status} 상품`),
                        price: 12000,
                    })),
                    nextCursor: isNext ? null : "18",
                    hasNext: !isNext,
                    totalCount: 4,
                    statusCounts: { DRAFT: 2, ON_SALE: 1, SOLD_OUT: 1 },
                },
                error: null,
            },
        });
    });
    await page.goto("/my/products");
    const group = page.getByRole("group", { name: "상품 분류" });
    await expect(group.getByRole("button")).toHaveCount(4);
    await expect(group.getByRole("button", { name: "전체 4", exact: true })).toBeVisible();
    await expect(group.getByRole("button", { name: "등록됨 2", exact: true })).toBeVisible();
    await expect(group.getByRole("button", { name: "판매중 1", exact: true })).toBeVisible();
    await expect(group.getByRole("button", { name: "판매완료 1", exact: true })).toBeVisible();
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(4);
    expect(requests[0]?.get("size")).toBe("100");
    expect(requests[0]?.has("cursor")).toBe(false);
    expect(requests[1]?.get("cursor")).toBe("18");
    expect(requests.every((params) => !params.has("status"))).toBe(true);
    for (const [label, status, count] of [
        ["등록됨", "DRAFT", 2],
        ["판매중", "ON_SALE", 1],
        ["판매완료", "SOLD_OUT", 1],
    ] as const) {
        await group.getByRole("button", { name: `${label} ${count}`, exact: true }).click();
        await expect(rows).toHaveCount(count);
        await expect(rows.first()).toContainText(`${status} 상품`);
        await expect(
            group.getByRole("button", { name: `${label} ${count}`, exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
        await expect(rows.first().locator("td").nth(3).locator("span")).toHaveCSS(
            "color",
            status === "ON_SALE" ? "rgb(250, 80, 61)" : "rgb(131, 136, 158)",
        );
    }
    await group.getByRole("button", { name: "전체 4", exact: true }).click();
    await expect(rows).toHaveCount(4);
    expect(requests).toHaveLength(2);
});

test("my products retry incomplete list loading without displaying partial counts", async ({
    page,
}) => {
    let nextAttempts = 0;
    await page.route("**/products/me?*", (route) => {
        const isNext = new URL(route.request().url()).searchParams.has("cursor");
        if (isNext) nextAttempts += 1;
        return route.fulfill({
            json:
                isNext && nextAttempts === 1
                    ? { success: false, message: "상품 조회 실패", data: null, error: null }
                    : {
                          success: true,
                          data: {
                              content: [
                                  productSummary(
                                      isNext ? 19 : 20,
                                      "DRAFT",
                                      isNext ? "다음 상품" : "첫 상품",
                                  ),
                              ],
                              nextCursor: isNext ? null : "20",
                              hasNext: !isNext,
                              totalCount: 2,
                              statusCounts: { DRAFT: 2, ON_SALE: 0, SOLD_OUT: 0 },
                          },
                          error: null,
                      },
        });
    });
    await page.goto("/my/products");
    await expect(page.locator("main").getByRole("alert")).toHaveText("상품 조회 실패");
    await expect(page.getByRole("button", { name: "전체 —", exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader")).toHaveCount(5);
    await page.getByRole("button", { name: "다시 시도", exact: true }).click();
    await expect(page.locator("tbody tr")).toHaveCount(2);
    await expect(page.getByRole("button", { name: "전체 2", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "등록됨 2", exact: true })).toBeVisible();
    expect(nextAttempts).toBe(2);
    await page.getByRole("button", { name: "판매중 0", exact: true }).click();
    await expect(page.locator("tbody").getByRole("status")).toHaveText(
        "해당 상태의 상품이 없습니다.",
    );
});
test("product table keeps headers during status loading and fits narrow screens", async ({
    page,
}, testInfo) => {
    let finishRequest!: () => void;
    const responseReady = new Promise<void>((resolve) => {
        finishRequest = resolve;
    });
    await page.route("**/products/me?*", async (route) => {
        await responseReady;
        return route.fulfill({
            json: {
                success: true,
                data: {
                    content: (["DRAFT", "ON_SALE"] as const).map((status, index) => ({
                        ...productSummary(
                            index + 1,
                            status,
                            "일본 교토 벚꽃 커플 스냅 사진 촬영 서비스 긴 상품명입니다",
                        ),
                        price: 150000,
                    })),
                    nextCursor: null,
                    hasNext: false,
                    totalCount: 2,
                    statusCounts: { DRAFT: 1, ON_SALE: 1, SOLD_OUT: 0 },
                },
                error: null,
            },
        });
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/my/products");
    const headers = page.getByRole("columnheader");
    await expect(headers).toHaveCount(5);
    await expect(page.locator("tbody").getByRole("status")).toHaveText("상품을 불러오는 중입니다.");
    finishRequest();
    await expect(page.locator("tbody")).toContainText("—");
    const headerBox = await page.locator("thead").boundingBox();
    for (const width of [1440, 1024, 768, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect(headers).toHaveCount(5);
        if (width === 1440) {
            expect(
                await page
                    .locator('[data-slot="table-container"]')
                    .evaluate((element) => element.scrollWidth <= element.clientWidth),
            ).toBe(true);
        }
        expect(
            await page
                .locator("main")
                .evaluate((element) => element.scrollWidth <= element.clientWidth),
        ).toBe(true);
        const cells = page.locator("tbody td");
        expect(
            await cells.evaluateAll((elements) =>
                elements.every((element) => element.scrollWidth <= element.clientWidth + 1),
            ),
        ).toBe(true);
        expect(
            await cells.evaluateAll((elements) =>
                elements.map(
                    (element) => getComputedStyle(element.firstElementChild ?? element).fontSize,
                ),
            ),
        ).toEqual(Array(10).fill("14px"));
        if (width === 1440 || width === 390)
            await page.screenshot({
                path: testInfo.outputPath(`products-${width}.png`),
                fullPage: true,
            });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: /^판매중/ }).click();
    await expect(headers).toHaveCount(5);
    expect((await page.locator("thead").boundingBox())?.y).toBe(headerBox?.y);
    await expect(page.locator("tbody")).toContainText("—");
    await page.getByRole("button", { name: /^판매완료/ }).click();
    await expect(page.locator("tbody").getByRole("status")).toHaveText(
        "해당 상태의 상품이 없습니다.",
    );
    await expect(headers).toHaveCount(5);
    expect((await page.locator("thead").boundingBox())?.y).toBe(headerBox?.y);
});

test("platform connection validates input and updates status counts without an API write", async ({
    page,
}) => {
    const writes: string[] = [];
    page.on("request", (request) => {
        if (
            ["POST", "PUT", "PATCH", "DELETE"].includes(request.method()) &&
            !request.url().includes("/auth/refresh")
        )
            writes.push(request.url());
    });
    await page.goto("/my/platforms");
    const summary = (label: string) =>
        page.getByText(label, { exact: true }).locator("..").locator("p").first();
    await expect(summary("연결됨")).toHaveText("0");
    await expect(summary("만료됨")).toHaveText("1");
    const input = page.getByRole("textbox", { name: "번개장터 연결 정보" });
    const connect = page.getByRole("button", { name: "번개장터 다시 연결", exact: true });
    await connect.click();
    await expect(
        page.getByRole("alert").filter({ hasText: "연결 정보를 입력해주세요." }),
    ).toBeVisible();
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await input.fill("   ");
    await connect.click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await input.fill("preview-connection-value");
    await expect(input).toHaveAttribute("aria-invalid", "false");
    await connect.click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: "취소", exact: true }).click();
    await expect(connect).toBeVisible();
    await connect.click();
    await dialog.getByRole("button", { name: "연결하기", exact: true }).click();
    await expect(
        page.getByRole("button", { name: "번개장터 연결 해제", exact: true }),
    ).toBeVisible();
    await expect(summary("연결됨")).toHaveText("1");
    await expect(summary("만료됨")).toHaveText("0");
    await page.getByRole("button", { name: "번개장터 연결 해제", exact: true }).click();
    await dialog.getByRole("button", { name: "연결 해제", exact: true }).click();
    await expect(summary("연결됨")).toHaveText("0");
    await expect(summary("미연결")).toHaveText("1");
    await expect(page.getByRole("button", { name: "번개장터 연결", exact: true })).toBeVisible();
    expect(writes).toEqual([]);
});

test("withdrawal requires consent and cancellation sends no request", async ({ page }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
        if (
            ["POST", "PUT", "PATCH", "DELETE"].includes(request.method()) &&
            !request.url().includes("/auth/refresh")
        )
            writes.push(request.url());
    });
    await page.goto("/my/withdraw");
    const next = page.getByRole("button", { name: "탈퇴 요청", exact: true });
    await expect(next).toBeDisabled();
    await page.getByRole("checkbox", { name: /위 안내 사항을 모두 확인/ }).check();
    await expect(next).toBeDisabled();
    await page.getByRole("checkbox", { name: /개인 정보 및 서비스 이용 기록/ }).check();
    await next.click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "나가기", exact: true })
        .click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    expect(writes).toEqual([]);
});

test("withdrawal disables repeat submissions and redirects after success", async ({ page }) => {
    let finishRequest!: () => void;
    const responseReady = new Promise<void>((resolve) => {
        finishRequest = resolve;
    });
    let requests = 0;
    await page.route("**/users/me", async (route) => {
        if (route.request().method() !== "DELETE") return route.fallback();
        requests++;
        expect(route.request().headers().authorization).toBe("Bearer my-ui-preview");
        await responseReady;
        await route.fulfill({
            status: 200,
            json: { success: true, message: "탈퇴 완료", data: null, error: null },
        });
    });
    await page.goto("/my/withdraw");
    await page.getByRole("checkbox", { name: /위 안내 사항을 모두 확인/ }).check();
    await page.getByRole("checkbox", { name: /개인 정보 및 서비스 이용 기록/ }).check();
    await page.getByRole("button", { name: "탈퇴 요청", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: "탈퇴하기", exact: true }).click();
    await expect(
        dialog.getByRole("button", { name: "탈퇴 처리 중...", exact: true }),
    ).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "취소", exact: true })).toBeDisabled();
    finishRequest();
    await expect(dialog).toContainText("회원 탈퇴가 완료되었습니다.");
    await dialog.getByRole("button", { name: "확인", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(
        page.getByRole("banner").getByRole("button", { name: "로그인", exact: true }),
    ).toBeVisible();
    expect(requests).toBe(1);
});

test("withdrawal failure keeps the dialog and authenticated session", async ({ page }) => {
    await page.route("**/users/me", (route) => {
        if (route.request().method() !== "DELETE") return route.fallback();
        return route.fulfill({
            status: 200,
            json: {
                success: false,
                message: "탈퇴 요청을 처리하지 못했습니다.",
                data: null,
                error: null,
            },
        });
    });
    await page.goto("/my/withdraw");
    await page.getByRole("checkbox", { name: /위 안내 사항을 모두 확인/ }).check();
    await page.getByRole("checkbox", { name: /개인 정보 및 서비스 이용 기록/ }).check();
    await page.getByRole("button", { name: "탈퇴 요청", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: "탈퇴하기", exact: true }).click();
    await expect(dialog).toContainText("탈퇴 요청을 처리하지 못했습니다.");
    await dialog.getByRole("button", { name: "확인", exact: true }).click();
    await expect(page).toHaveURL(/\/my\/withdraw$/);
    await expect(
        page.getByRole("banner").getByRole("link", { name: "프로필", exact: true }),
    ).toBeVisible();
});
