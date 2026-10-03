import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import type { SearchResultItem } from "../src/features/search/types";

const product: SearchResultItem = {
    source: "OUR",
    id: 1,
    title: "아이패드 프로 11인치 4세대",
    brand: "애플",
    price: 800000,
    status: "ON_SALE",
    condition: "S",
    defectStatus: "NORMAL",
    purchasedMonths: 2,
    categoryName: "전자기기",
    thumbnailUrl: null,
    recommendation: "HOLD",
    marketAveragePrice: 823000,
    platformName: null,
    externalUrl: null,
    createdAt: "2026-09-15T10:00:00",
};

async function authenticate(page: Page) {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "search-token" }, error: null },
        }),
    );
}

for (const loggedIn of [true, false]) {
    test(`loads cursor pages on scroll and keeps source IDs distinct (${loggedIn ? "member" : "guest"})`, async ({
        page,
    }) => {
        if (loggedIn) await authenticate(page);
        await page.route("https://example.com/image.jpg", (route) =>
            route.fulfill({
                contentType: "image/png",
                body: Buffer.from(
                    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=",
                    "base64",
                ),
            }),
        );
        const requests: URLSearchParams[] = [];
        await page.route("**/products?*", (route) => {
            const request = route.request();
            expect(request.headers().authorization).toBe(
                loggedIn ? "Bearer search-token" : undefined,
            );
            const params = new URL(request.url()).searchParams;
            requests.push(params);
            const isNextPage = params.has("cursor");
            const content: SearchResultItem[] = isNextPage
                ? [{ ...product, source: "OUR", id: 21, title: "다음 페이지 상품" }]
                : [
                      { ...product, thumbnailUrl: "https://example.com/image.jpg" },
                      {
                          ...product,
                          source: "EXTERNAL",
                          id: 1,
                          title: "번개장터 매물",
                          status: "SELLING",
                          brand: null,
                          condition: null,
                          defectStatus: null,
                          purchasedMonths: null,
                          marketAveragePrice: null,
                          recommendation: null,
                          platformName: "번개장터",
                          externalUrl: "https://m.bunjang.co.kr/products/1",
                      },
                      ...Array.from({ length: 18 }, (_, index) => ({
                          ...product,
                          id: index + 2,
                          title: `상품 ${index + 2}`,
                      })),
                  ];
            return route.fulfill({
                json: {
                    success: true,
                    data: {
                        content,
                        nextCursor: isNextPage ? null : 1789843458645,
                        hasNext: !isNextPage,
                    },
                    error: null,
                },
            });
        });

        await page.goto("/search");
        await expect(page.locator("main [data-slot=card]")).toHaveCount(20);
        await expect(page.getByAltText(product.title)).toBeVisible();
        await expect(page.locator("main")).toContainText("미개봉 · 하자 없음");
        const ownCard = page.locator("main [data-slot=card]").filter({
            has: page.getByRole("heading", { name: product.title }),
        });
        const externalCard = page.locator("main [data-slot=card]").filter({
            has: page.getByRole("heading", { name: "번개장터 매물" }),
        });
        await expect(ownCard.locator("[data-slot=badge]").nth(1)).toHaveCSS(
            "background-color",
            "rgb(250, 251, 255)",
        );
        await expect(externalCard.locator("[data-slot=badge]").nth(1)).toHaveCSS(
            "background-color",
            "rgb(241, 241, 241)",
        );
        await expect(ownCard.locator("time")).toContainText(/일 전/);
        expect(requests[0]?.get("size")).toBe("20");
        expect(requests[0]?.has("cursor")).toBe(false);
        await expect(page.locator("main")).toContainText("번개장터");
        await expect(page.locator("main")).toContainText("평균보다 3% 낮아요");
        await expect(page.getByRole("navigation", { name: "검색 결과 페이지" })).toHaveCount(0);

        await page.locator("main").evaluate((element) => element.scrollIntoView({ block: "end" }));
        await expect(page.locator("main [data-slot=card]")).toHaveCount(21);
        expect(requests[1]?.get("cursor")).toBe("1789843458645");
        expect(requests).toHaveLength(2);
        await expect(page.getByRole("heading", { name: "다음 페이지 상품" })).toBeVisible();
        await page.setViewportSize({ width: 390, height: 844 });
        expect(
            await page.locator("main").evaluate((element) => element.scrollWidth <= innerWidth),
        ).toBe(true);
    });

    test(`submits keyword and supported status, resetting the cursor (${loggedIn ? "member" : "guest"})`, async ({
        page,
    }) => {
        if (loggedIn) await authenticate(page);
        const requests: URLSearchParams[] = [];
        await page.route("**/products?*", (route) => {
            const params = new URL(route.request().url()).searchParams;
            requests.push(params);
            return route.fulfill({
                json: {
                    success: true,
                    data: {
                        content: [{ ...product, status: "DRAFT" }],
                        hasNext: false,
                        nextCursor: null,
                    },
                    error: null,
                },
            });
        });
        await page.goto("/search");
        await expect(page.locator("main [data-slot=card]")).toHaveCount(1);
        await page.getByRole("textbox", { name: "상품 검색" }).fill("아이패드");
        await page.getByRole("search").getByRole("button", { name: "검색", exact: true }).click();
        await expect.poll(() => requests.at(-1)?.get("keyword")).toBe("아이패드");
        await page.getByRole("checkbox", { name: "등록됨", exact: true }).check();
        await expect.poll(() => requests.at(-1)?.get("status")).toBe("DRAFT");
        expect(requests.at(-1)?.has("cursor")).toBe(false);
        await expect(page.locator("main")).toContainText("등록됨");
        await expect(page.locator("main")).toContainText("최신순");
    });
}

test("shows a business error and retries", async ({ page }) => {
    await authenticate(page);
    let attempts = 0;
    await page.route("**/products?*", (route) =>
        route.fulfill({
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
    await expect(page.locator("main").getByRole("status")).toHaveText("검색 결과가 없습니다.");
    expect(attempts).toBe(2);
});

test("keeps loaded cards and retries a failed next page", async ({ page }) => {
    await authenticate(page);
    let nextPageAttempts = 0;
    await page.route("**/products?*", (route) => {
        const hasCursor = new URL(route.request().url()).searchParams.has("cursor");
        if (hasCursor) nextPageAttempts += 1;
        return route.fulfill({
            status: hasCursor && nextPageAttempts === 1 ? 500 : 200,
            json:
                hasCursor && nextPageAttempts === 1
                    ? { success: false, message: "다음 상품 조회 실패", data: null, error: null }
                    : {
                          success: true,
                          data: {
                              content: hasCursor
                                  ? [{ ...product, id: 21, title: "다음 페이지 상품" }]
                                  : Array.from({ length: 20 }, (_, index) => ({
                                        ...product,
                                        id: index + 1,
                                    })),
                              nextCursor: hasCursor ? null : 1789843458645,
                              hasNext: !hasCursor,
                          },
                          error: null,
                      },
        });
    });
    await page.goto("/search");
    await expect(page.locator("main [data-slot=card]")).toHaveCount(20);
    await page.locator("main").evaluate((element) => element.scrollIntoView({ block: "end" }));
    await expect(page.locator("main").getByRole("alert")).toHaveText("다음 상품 조회 실패");
    await expect(page.locator("main [data-slot=card]")).toHaveCount(20);
    await page.getByRole("button", { name: "다시 시도" }).click();
    await expect(page.locator("main [data-slot=card]")).toHaveCount(21);
    expect(nextPageAttempts).toBe(2);
});
