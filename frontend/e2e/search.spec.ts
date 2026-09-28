import type { Page } from "@playwright/test";
import type { SearchResultItem } from "../src/features/search/types";
import { expect, test } from "./fixtures";

const product: SearchResultItem = {
    source: "OUR",
    id: 1,
    title: "실제 상품 제목",
    brand: "Apple",
    price: 345000,
    status: "ON_SALE",
    condition: "A",
    defectStatus: "NORMAL",
    purchasedMonths: 3,
    categoryName: "휴대폰",
    thumbnailUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=",
    recommendation: "BUY",
    marketAveragePrice: 400000,
    platformName: null,
    externalUrl: null,
    createdAt: "2026-09-28T10:00:00",
};

async function authenticate(page: Page) {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            status: 200,
            json: { success: true, data: { accessToken: "search-token" }, error: null },
        }),
    );
}

test("renders returned products and thumbnails, including colliding source IDs", async ({
    page,
}) => {
    await authenticate(page);
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route("**/products?*", async (route) => {
        expect(route.request().headers().authorization).toBe("Bearer search-token");
        expect(new URL(route.request().url()).searchParams.get("size")).toBe("9");
        await ready;
        await route.fulfill({
            status: 200,
            json: {
                success: true,
                data: {
                    content: [
                        product,
                        {
                            ...product,
                            source: "EXTERNAL",
                            title: "외부 상품",
                            platformName: "번개장터",
                            condition: null,
                            marketAveragePrice: null,
                            status: "판매중",
                        },
                    ],
                    nextCursor: null,
                    hasNext: false,
                },
                error: null,
            },
        });
    });
    await page.goto("/search");
    await expect(page.getByRole("main").getByRole("status")).toHaveText(
        "상품을 불러오는 중입니다.",
    );
    release();
    await expect(page.getByRole("heading", { name: product.title, exact: true })).toBeVisible();
    await expect(page.locator("main [data-slot=card]")).toHaveCount(2);
    await expect(page.getByAltText(product.title)).toBeVisible();
    await expect(page.locator("main")).toContainText("345,000원");
    await expect(page.locator("main")).toContainText("↓ 평균보다 14% 낮아요");
    await expect(page.locator("main")).toContainText("? 비교 데이터 부족");
    await expect(page.locator("main")).toContainText("2개 표시");
    const heart = page.getByRole("button", { name: product.title + " 관심 상품" });
    await heart.click();
    await expect(heart).toHaveCSS("color", "rgb(250, 80, 61)");
    await expect(page.getByRole("button", { name: "외부 상품 관심 상품" })).toHaveAttribute(
        "aria-pressed",
        "false",
    );
    await expect(page.getByRole("button", { name: "다음 페이지", exact: true })).toBeDisabled();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.locator("main").evaluate((el) => el.scrollWidth <= innerWidth)).toBe(true);
});

test("uses opaque cursors and resets paging for submitted keywords and status filters", async ({
    page,
}) => {
    await authenticate(page);
    const requests: URLSearchParams[] = [];
    await page.route("**/products?*", (route) => {
        const params = new URL(route.request().url()).searchParams;
        requests.push(params);
        const nextPage = params.has("cursor");
        return route.fulfill({
            status: 200,
            json: {
                success: true,
                data: {
                    content: [
                        { ...product, title: nextPage ? "다음 페이지 상품" : "첫 페이지 상품" },
                    ],
                    nextCursor: nextPage ? null : 1770000123456,
                    hasNext: !nextPage,
                },
                error: null,
            },
        });
    });
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: "첫 페이지 상품" })).toBeVisible();
    await page.getByRole("button", { name: "다음 페이지", exact: true }).click();
    await expect(page.getByRole("heading", { name: "다음 페이지 상품" })).toBeVisible();
    expect(requests.at(-1)?.get("cursor")).toBe("1770000123456");
    await expect(page.getByRole("button", { name: "다음 페이지", exact: true })).toBeDisabled();
    await page.getByRole("textbox", { name: "상품 검색", exact: true }).fill("갤럭시");
    expect(requests.at(-1)?.get("keyword")).toBeNull();
    await page.getByRole("search").getByRole("button", { name: "검색", exact: true }).click();
    await expect(page.getByRole("heading", { name: "'갤럭시'", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "첫 페이지 상품" })).toBeVisible();
    expect(requests.at(-1)?.get("keyword")).toBe("갤럭시");
    expect(requests.at(-1)?.has("cursor")).toBe(false);
    await page.getByRole("checkbox", { name: "예약중", exact: true }).check();
    await expect.poll(() => requests.at(-1)?.get("status")).toBe("RESERVED");
    expect(requests.at(-1)?.has("cursor")).toBe(false);
    await expect(page.getByRole("button", { name: "이전 페이지", exact: true })).toBeDisabled();
    await page.getByRole("checkbox", { name: "예약중", exact: true }).uncheck();
    await expect.poll(() => requests.at(-1)?.get("status")).toBeNull();
});

test("shows a business error, retries, and renders an empty result", async ({ page }) => {
    await authenticate(page);
    let attempts = 0;
    await page.route("**/products?*", (route) =>
        route.fulfill({
            status: 200,
            json:
                ++attempts === 1
                    ? { success: false, message: "상품 조회 실패", data: null, error: null }
                    : {
                          success: true,
                          data: { content: [], nextCursor: null, hasNext: false },
                          error: null,
                      },
        }),
    );
    await page.goto("/search");
    await expect(page.locator("main").getByRole("alert")).toHaveText("상품 조회 실패");
    await page.getByRole("button", { name: "다시 시도" }).click();
    await expect(page.getByRole("status")).toHaveText("검색 결과가 없습니다.");
    await expect(page.locator("main [data-slot=card]")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "검색 결과 페이지" })).toHaveCount(0);
});

test("renders HTTP failures without fake cards", async ({ page }) => {
    await authenticate(page);
    await page.route("**/products?*", (route) =>
        route.fulfill({
            status: 500,
            json: {
                success: false,
                message: "일시적인 조회 오류",
                data: null,
                error: null,
            },
        }),
    );
    await page.goto("/search");
    await expect(page.locator("main").getByRole("alert")).toContainText("일시적인 조회 오류");
    await expect(page.locator("main [data-slot=card]")).toHaveCount(0);
});

test("does not request authenticated products for guests", async ({ page }) => {
    let requests = 0;
    await page.route("**/products?*", (route) => {
        requests++;
        return route.abort();
    });
    await page.goto("/search");
    await expect(page.locator("main")).toContainText("로그인 후 상품을 조회할 수 있습니다.");
    expect(requests).toBe(0);
    await expect(
        page.locator("main").getByRole("link", { name: "로그인", exact: true }),
    ).toHaveAttribute("href", "/login");
});
