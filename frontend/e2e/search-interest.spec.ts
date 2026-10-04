import { expect, test } from "./fixtures";
import { detailProduct } from "./product-detail-fixture";

const products = ["OUR", "EXTERNAL"].map((source) => ({
    source,
    id: 42,
    title: `${source} 상품`,
    price: 1000,
    status: "ON_SALE",
    condition: null,
    defectStatus: null,
    thumbnailUrl: null,
    platformName: "번개장터",
    marketAveragePrice: null,
    categoryName: "전자기기",
    createdAt: "2026-10-01T10:00:00",
}));

test.beforeEach(async ({ page }) => {
    await page.route("**/products/42", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: { ...detailProduct, id: 42 },
                error: null,
            },
        }),
    );
    await page.route("**/products?*", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: { content: products, hasNext: false, nextCursor: null },
                error: null,
            },
        }),
    );
});

test("restores all interest pages, uses source-specific IDs and shares state with detail", async ({
    page,
}) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: { accessToken: "interest-token" },
                error: null,
            },
        }),
    );
    let saved = true;
    let fail = true;
    let posts = 0;
    let deletes = 0;
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
        release = resolve;
    });
    const cursors: (string | null)[] = [];
    await page.route(
        (url) => url.pathname === "/interests",
        async (route) => {
            const request = route.request();
            expect(request.headers().authorization).toBe("Bearer interest-token");
            if (request.method() === "POST") {
                posts++;
                expect(request.postDataJSON()).toEqual({ source: "EXTERNAL", targetId: 42 });
                if (fail)
                    return route.fulfill({
                        status: 500,
                        json: { success: false, message: "등록 실패", data: null, error: null },
                    });
                await ready;
                saved = true;
                return route.fulfill({
                    status: 201,
                    json: {
                        success: true,
                        data: { interestId: 1001 },
                        error: null,
                    },
                });
            }
            const cursor = new URL(request.url()).searchParams.get("cursor");
            cursors.push(cursor);
            return route.fulfill({
                json: {
                    success: true,
                    data:
                        cursor === null
                            ? {
                                  content: [{ source: "OUR", targetId: 999, interestId: 2000 }],
                                  hasNext: true,
                                  nextCursor: "2000",
                              }
                            : {
                                  content: saved
                                      ? [{ source: "EXTERNAL", targetId: 42, interestId: 1001 }]
                                      : [],
                                  hasNext: false,
                                  nextCursor: null,
                              },
                    error: null,
                },
            });
        },
    );
    await page.route("**/interests/1001", (route) => {
        expect(route.request().method()).toBe("DELETE");
        deletes++;
        if (fail)
            return route.fulfill({
                status: 500,
                json: { success: false, message: "삭제 실패", data: null, error: null },
            });
        saved = false;
        return route.fulfill({ json: { success: true, data: null, error: null } });
    });
    await page.goto("/search");
    const external = page.getByRole("button", { name: "EXTERNAL 상품 관심 상품", exact: true });
    const our = page.getByRole("button", { name: "OUR 상품 관심 상품", exact: true });
    await expect(external).toBeEnabled();
    await expect(external).toHaveAttribute("aria-pressed", "true");
    await expect(our).toHaveAttribute("aria-pressed", "false");
    expect(cursors.slice(0, 2)).toEqual([null, "2000"]);
    await external.click();
    await expect(page.locator("main").getByRole("alert")).toContainText("삭제 실패");
    await expect(external).toHaveAttribute("aria-pressed", "true");
    fail = false;
    await external.click();
    await expect(external).toHaveAttribute("aria-pressed", "false");
    fail = true;
    await external.click();
    await expect(page.locator("main").getByRole("alert")).toContainText("등록 실패");
    await expect(external).toHaveAttribute("aria-pressed", "false");
    fail = false;
    await external.click();
    await expect(external).toBeDisabled();
    release();
    await expect(external).toHaveAttribute("aria-pressed", "true");
    await expect(external.locator("svg")).toHaveAttribute("fill", "currentColor");
    await page.getByRole("link", { name: "EXTERNAL 상품 상세보기" }).click();
    const detail = page.getByRole("button", { name: "관심상품에 추가됨", exact: true });
    await expect(detail).toBeEnabled();
    await expect(detail).toHaveAttribute("aria-pressed", "true");
    await detail.click();
    await expect(
        page.getByRole("button", { name: "관심상품에 추가", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("link", { name: "← 이전 페이지" }).click();
    await expect(external).toHaveAttribute("aria-pressed", "false");
    await page.reload();
    await expect(external).toBeEnabled();
    await expect(external).toHaveAttribute("aria-pressed", "false");
    expect(posts).toBe(2);
    expect(deletes).toBe(3);
});

test("saved interests survive reload and revisits and appear in the wishlist", async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "interest-token" }, error: null },
        }),
    );
    let saved = false;
    const interest = {
        interestId: 1001,
        source: "EXTERNAL",
        targetId: 42,
        title: "EXTERNAL 상품",
        price: 1000,
        status: "ON_SALE",
        condition: null,
        categoryName: "전자기기",
        thumbnailUrl: null,
        recommendation: "BUY",
        interestStatus: "BUY",
        marketAveragePrice: null,
        platformName: "번개장터",
        externalUrl: null,
        targetPrice: null,
        createdAt: "2026-10-04T10:00:00",
    };
    await page.route(
        (url) => url.pathname === "/interests",
        (route) => {
            if (route.request().method() === "POST") {
                expect(route.request().postDataJSON()).toEqual({
                    source: "EXTERNAL",
                    targetId: 42,
                });
                saved = true;
                return route.fulfill({
                    json: {
                        success: true,
                        data: { interestId: 1001 },
                        error: null,
                    },
                });
            }
            return route.fulfill({
                json: {
                    success: true,
                    data: {
                        content: saved ? [interest] : [],
                        nextCursor: null,
                        hasNext: false,
                        totalCount: saved ? 1 : 0,
                        statusCounts: { BUY: saved ? 1 : 0, WAIT: 0, SOLD_OUT: 0, PENDING: 0 },
                    },
                    error: null,
                },
            });
        },
    );
    await page.route("**/interests/1001", (route) => {
        expect(route.request().method()).toBe("DELETE");
        saved = false;
        return route.fulfill({ json: { success: true, data: null, error: null } });
    });
    await page.goto("/search");
    const favorite = page.getByRole("button", { name: "EXTERNAL 상품 관심 상품", exact: true });
    await expect(favorite).toBeEnabled();
    await expect(favorite).toHaveAttribute("aria-pressed", "false");
    await favorite.click();
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(favorite).toBeEnabled();
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
    await page.goto("/buy/wishlist");
    await expect(page.locator("main").getByText("EXTERNAL 상품", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "상품 검색하기", exact: true }).click();
    await expect(favorite).toBeEnabled();
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
    await favorite.click();
    await expect(favorite).toHaveAttribute("aria-pressed", "false");
    await page.reload();
    await expect(favorite).toBeEnabled();
    await expect(favorite).toHaveAttribute("aria-pressed", "false");
    await page.goto("/buy/wishlist");
    await expect(page.locator("main")).toContainText("관심상품이 없습니다.");
});

test("guests can search but interest buttons require login without API writes", async ({
    page,
}) => {
    let requests = 0;
    page.on("request", (request) => {
        if (new URL(request.url()).pathname.startsWith("/interests")) requests++;
    });
    await page.goto("/search");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await page.getByRole("button", { name: "OUR 상품 관심 상품" }).click();
    const dialog = page.getByRole("alertdialog", { name: "로그인이 필요합니다" });
    await expect(dialog).toContainText("로그인 후 사용해 주세요.");
    await dialog.getByRole("button", { name: "확인", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/search/42");
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "관심상품에 추가", exact: true }).click();
    await expect(dialog).toContainText("로그인 후 사용해 주세요.");
    await dialog.getByRole("button", { name: "확인", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(requests).toBe(0);
});

test("an incomplete interest list disables toggles until a successful retry", async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: { accessToken: "interest-token" },
                error: null,
            },
        }),
    );
    let fail = true;
    await page.route(
        (url) => url.pathname === "/interests",
        (route) => {
            expect(route.request().method()).toBe("GET");
            const cursor = new URL(route.request().url()).searchParams.get("cursor");
            if (cursor && fail)
                return route.fulfill({
                    status: 500,
                    json: {
                        success: false,
                        message: "관심 목록 조회 실패",
                        data: null,
                        error: null,
                    },
                });
            return route.fulfill({
                json: {
                    success: true,
                    data: {
                        content: cursor ? [] : [{ source: "OUR", targetId: 42, interestId: 2000 }],
                        hasNext: cursor === null,
                        nextCursor: cursor === null ? "2000" : null,
                    },
                    error: null,
                },
            });
        },
    );
    await page.goto("/search");
    const favorite = page.getByRole("button", { name: "OUR 상품 관심 상품", exact: true });
    await expect(page.locator("main").getByRole("alert")).toContainText("관심 목록 조회 실패");
    await expect(favorite).toBeDisabled();
    fail = false;
    await page.getByRole("button", { name: "관심상품 다시 조회" }).click();
    await expect(favorite).toBeEnabled();
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
});
