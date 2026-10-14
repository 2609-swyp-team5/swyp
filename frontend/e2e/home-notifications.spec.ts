import { test, expect } from "./fixtures";
import { popularProducts } from "./home-product-fixture";

test.beforeEach(async ({ page }) => {
    await page.route("**/products/popular", (route) =>
        route.fulfill({ json: { success: true, data: popularProducts, error: null } }),
    );
});

test("guest home publishes the shared design and forwards search keywords", async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/home");
    await expect(page.getByRole("banner").getByRole("button", { name: "로그인" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "상품 일반 검색" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "인기 상품 모음", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "안녕하세요", exact: false })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "내 물건 추천", exact: true })).toHaveCount(0);
    await expect(page.getByText("지금, 타이밍을 확인해보세요.", { exact: true })).toHaveCount(0);
    const carousel = page.locator('[role="region"][aria-label="인기 상품 모음"]');
    await expect(carousel.getByRole("heading", { name: "인기 상품 1", exact: true })).toBeVisible();
    await expect(carousel.getByRole("link", { name: "인기 상품 1 상세보기" })).toHaveAttribute(
        "href",
        "/search/701",
    );
    await expect(carousel.getByRole("img", { name: "인기 상품 1", exact: true })).toBeVisible();
    await expect(carousel).toContainText("10,000원");
    await expect(carousel).toContainText("판매완료");
    await expect(carousel).toContainText("비교 데이터 부족");
    await expect(carousel.getByRole("button", { name: /페이지$/ })).toHaveCount(4);
    const favorite = carousel.getByRole("button", {
        name: "인기 상품 모음 인기 상품 1 관심 상품",
        exact: true,
    });
    await favorite.click();
    await expect(page.getByRole("alertdialog")).toContainText("로그인 후 사용해 주세요.");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(favorite).toHaveAttribute("aria-pressed", "false");
    await expect(favorite.locator("svg")).toHaveAttribute("fill", "none");
    await carousel.getByRole("button", { name: "인기 상품 모음 다음", exact: true }).click();
    await expect(carousel.getByRole("button", { name: "인기 상품 모음 2페이지" })).toHaveAttribute(
        "aria-current",
        "page",
    );
    await page.screenshot({ path: testInfo.outputPath("guest-home-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(carousel.getByRole("button", { name: /페이지$/ })).toHaveCount(10);
    await carousel.getByRole("button", { name: "인기 상품 모음 10페이지", exact: true }).click();
    await expect(
        carousel.getByRole("heading", { name: "인기 상품 10", exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
    );
    await page.screenshot({ path: testInfo.outputPath("guest-home-mobile.png"), fullPage: true });
    const requests: string[] = [];
    await page.route("**/products?*", (route) => {
        requests.push(route.request().url());
        return route.fulfill({
            json: {
                success: true,
                data: { content: [], nextCursor: null, hasNext: false },
                error: null,
            },
        });
    });
    await page.getByRole("textbox", { name: "홈 상품 검색어" }).fill("필름카메라");
    await page.getByRole("button", { name: "상품 검색", exact: true }).click();
    await expect(page).toHaveURL(/\/search\?keyword=/);
    await expect
        .poll(() =>
            requests.some((url) => new URL(url).searchParams.get("keyword") === "필름카메라"),
        )
        .toBe(true);
});

test("signed-in home adds the greeting and summary while hiding recommendations", async ({
    page,
}, testInfo) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "home-preview" }, error: null },
        }),
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/home");
    await expect(page.getByRole("heading", { name: "안녕하세요, 김민준님" })).toBeVisible();
    await expect(
        page.getByRole("region", { name: "나의 거래 요약" }).locator('[data-slot="card"]'),
    ).toHaveCount(4);
    await expect(page.locator("#recommended-products-heading")).toBeHidden();
    await expect(
        page.getByRole("link", { name: "판매 상품 등록하기", exact: true }),
    ).toHaveAttribute("href", "/sell/register");
    await page.screenshot({ path: testInfo.outputPath("member-home-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
    );
});

test("notifications filter their preview list and keep navigation working", async ({
    page,
}, testInfo) => {
    const now = new Date().toISOString();
    const notification = (
        notificationId: number,
        type: string,
        title: string,
        productId: number | null,
        listingId: number | null = null,
        createdAt = now,
    ) => ({
        notificationId,
        type,
        title,
        message: `${title} 설명`,
        productId,
        listingId,
        isRead: false,
        createdAt,
    });
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "notifications-preview" }, error: null },
        }),
    );
    const notifications = [
        notification(5, "SELL", "아이폰 13 지금 판매 추천", 10),
        notification(4, "BUY", "다이슨 에어랩 시세 하락 중", null, 20),
        notification(3, "TARGET_PRICE", "갤럭시 버즈 목표가 도달", 30),
        notification(2, "HOLD", "맥북 에어 판매 대기 추천", 40),
        notification(1, "NOTICE", "서비스 점검 안내", null, null, "2026-09-01T09:00:00"),
    ];
    // 서버 탭 분류(백엔드 NotificationCategory)와 같게 `category`로 거르고 탭별 건수를 준다
    const categoryTypes: Record<string, string[]> = {
        SELL: ["SELL", "HOLD", "SELL_TARGET_PRICE"],
        BUY: ["BUY", "WAIT", "TARGET_PRICE"],
        PRICE: ["SELL_PRICE_CHANGE", "BUY_PRICE_CHANGE"],
        PLATFORM: ["PLATFORM_EXPIRED"],
        NOTICE: ["NOTICE"],
    };
    const statusCounts = Object.fromEntries(
        Object.entries(categoryTypes).map(([category, types]) => [
            category,
            notifications.filter((item) => types.includes(item.type)).length,
        ]),
    );
    // 화면 경로와 API 경로가 같아 페이지 이동 요청은 그대로 통과시킨다
    await page.route(
        (url) => url.pathname === "/notifications",
        (route) => {
            if (route.request().isNavigationRequest()) return route.fallback();
            const category = new URL(route.request().url()).searchParams.get("category");
            const content = category
                ? notifications.filter((item) => categoryTypes[category].includes(item.type))
                : notifications;
            return route.fulfill({
                json: {
                    success: true,
                    data: {
                        content,
                        nextCursor: null,
                        hasNext: false,
                        totalCount: content.length,
                        statusCounts,
                    },
                    error: null,
                },
            });
        },
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/notifications");
    await expect(page.getByRole("heading", { name: "알림", exact: true })).toBeVisible();
    const main = page.getByRole("main");
    await expect(main.locator('[data-slot="card"]')).toHaveCount(5);
    await main.getByRole("tab", { name: "구매추천 2", exact: true }).click();
    await expect(main.locator('[data-slot="card"]')).toHaveCount(2);
    await expect(main.getByRole("heading", { name: "다이슨 에어랩 시세 하락 중" })).toBeVisible();
    await main.getByRole("tab", { name: "전체 5", exact: true }).click();
    await page.screenshot({
        path: testInfo.outputPath("notifications-desktop.png"),
        fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
    );
    await page.screenshot({
        path: testInfo.outputPath("notifications-mobile.png"),
        fullPage: true,
    });
    await main.getByRole("tab", { name: "판매추천 2", exact: true }).click();
    await expect(main.locator('[data-slot="card"]')).toHaveCount(2);
    await expect(
        main.getByRole("link", { name: "판매 분석 보기", exact: true }).first(),
    ).toHaveAttribute("href", "/sell/manage?selected=10");
    await main.getByRole("tab", { name: "전체 5", exact: true }).click();
    await expect(main.getByRole("heading", { name: "서비스 점검 안내" })).toBeVisible();
});

test("notifications can be deleted all at once or per tab after confirming", async ({
    page,
}, testInfo) => {
    const now = new Date().toISOString();
    let notifications = [
        { notificationId: 3, type: "SELL", title: "아이폰 13 지금 판매 추천", productId: 10 },
        { notificationId: 2, type: "BUY", title: "다이슨 에어랩 시세 하락 중", productId: null },
        { notificationId: 1, type: "HOLD", title: "맥북 에어 판매 대기 추천", productId: 40 },
    ].map((item) => ({
        ...item,
        message: `${item.title} 설명`,
        listingId: item.productId === null ? 20 : null,
        isRead: false,
        createdAt: now,
    }));
    const categoryTypes: Record<string, string[]> = {
        SELL: ["SELL", "HOLD"],
        BUY: ["BUY"],
        PRICE: [],
        PLATFORM: [],
        NOTICE: [],
    };
    const inCategory = (category: string | null) =>
        category
            ? notifications.filter((item) => categoryTypes[category].includes(item.type))
            : notifications;
    const deleteCalls: (string | null)[] = [];
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "notifications-delete" }, error: null },
        }),
    );
    await page.route(
        (url) => url.pathname === "/notifications",
        (route) => {
            if (route.request().isNavigationRequest()) return route.fallback();
            const category = new URL(route.request().url()).searchParams.get("category");
            if (route.request().method() === "DELETE") {
                deleteCalls.push(category);
                const deleted = inCategory(category);
                notifications = notifications.filter((item) => !deleted.includes(item));
                return route.fulfill({
                    json: { success: true, data: { deletedCount: deleted.length }, error: null },
                });
            }
            const content = inCategory(category);
            return route.fulfill({
                json: {
                    success: true,
                    data: {
                        content,
                        nextCursor: null,
                        hasNext: false,
                        totalCount: content.length,
                        statusCounts: Object.fromEntries(
                            Object.keys(categoryTypes).map((key) => [key, inCategory(key).length]),
                        ),
                    },
                    error: null,
                },
            });
        },
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/notifications");
    const main = page.getByRole("main");
    await expect(main.locator('[data-slot="card"]')).toHaveCount(3);

    await main.getByRole("tab", { name: "판매추천 2", exact: true }).click();
    await main.getByRole("button", { name: "판매추천 알림 전체 삭제" }).click();
    const dialog = page.getByRole("alertdialog", { name: "판매추천 알림을 모두 삭제할까요?" });
    await expect(dialog).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("notifications-delete-dialog.png") });
    await dialog.getByRole("button", { name: "삭제", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(main.getByText("해당하는 알림이 없습니다.")).toBeVisible();
    await expect(main.getByRole("tab", { name: "전체 1", exact: true })).toBeVisible();

    await main.getByRole("tab", { name: "전체 1", exact: true }).click();
    await expect(main.locator('[data-slot="card"]')).toHaveCount(1);
    await page.screenshot({ path: testInfo.outputPath("notifications-delete-all-button.png") });
    await main.getByRole("button", { name: "전체 삭제", exact: true }).click();
    await page
        .getByRole("alertdialog", { name: "알림을 모두 삭제할까요?" })
        .getByRole("button", { name: "삭제", exact: true })
        .click();
    await expect(main.getByText("아직 받은 알림이 없습니다.")).toBeVisible();
    await expect(main.getByRole("button", { name: "전체 삭제", exact: true })).toHaveCount(0);
    expect(deleteCalls).toEqual(["SELL", null]);
});
