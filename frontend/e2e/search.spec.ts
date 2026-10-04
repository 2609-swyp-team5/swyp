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
    tradeRegion: null,
    deliveryAvailable: false,
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
                        nextCursor: isNextPage ? null : "1789843458645",
                        hasNext: !isNextPage,
                        totalCount: isNextPage ? null : 21,
                    },
                    error: null,
                },
            });
        });

        await page.goto("/search");
        await expect(page.locator("main [data-slot=card]")).toHaveCount(20);
        await expect(page.getByText("검색결과 21개 표시", { exact: true })).toBeVisible();
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
        await expect(page.getByText("검색결과 21개 표시", { exact: true })).toBeVisible();
        expect(requests[1]?.get("cursor")).toBe("1789843458645");
        expect(requests).toHaveLength(2);
        await expect(page.getByRole("heading", { name: "다음 페이지 상품" })).toBeVisible();
        await page.setViewportSize({ width: 390, height: 844 });
        expect(
            await page.locator("main").evaluate((element) => element.scrollWidth <= innerWidth),
        ).toBe(true);
    });

    test(`submits keyword and one exact product status, resetting the cursor (${loggedIn ? "member" : "guest"})`, async ({
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
                        content: [
                            {
                                ...product,
                                status: params.get("status") ?? "ON_SALE",
                            },
                        ],
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
        await page
            .getByRole("search")
            .getByRole("button", { name: "일반 검색", exact: true })
            .click();
        await expect.poll(() => requests.at(-1)?.get("keyword")).toBe("아이패드");
        const statusGroup = page.getByRole("group", { name: "거래 상태" });
        for (const [label, status] of [
            ["임시저장", "DRAFT"],
            ["판매중", "ON_SALE"],
            ["판매완료", "SOLD_OUT"],
        ]) {
            await statusGroup.getByRole("checkbox", { name: label, exact: true }).check();
            await expect.poll(() => requests.at(-1)?.getAll("status")).toEqual([status]);
            expect(requests.at(-1)?.has("tradeStatus")).toBe(false);
            expect(requests.at(-1)?.has("cursor")).toBe(false);
            await expect(statusGroup.locator('[role="checkbox"][aria-checked="true"]')).toHaveCount(
                1,
            );
            await expect(page.locator("main [data-slot=card]")).toContainText(label);
        }
        await expect(page.locator("main")).toContainText("최신순");
        await page.getByRole("checkbox", { name: "판매완료", exact: true }).uncheck();
        await expect.poll(() => requests.at(-1)?.has("status")).toBe(false);
    });
}

test("sort selection reloads the list and keeps filters and sort-specific cursors", async ({
    page,
}) => {
    const requests: URLSearchParams[] = [];
    await page.route("**/products?*", (route) => {
        const params = new URL(route.request().url()).searchParams;
        requests.push(params);
        const sort = params.get("sort");
        const cursor = params.get("cursor");
        if (cursor) expect(cursor).toBe(`cursor-${sort}`);
        return route.fulfill({
            json: {
                success: true,
                data: {
                    content: [
                        { ...product, id: cursor ? 2 : 1, title: `${sort} 상품 ${cursor ? 2 : 1}` },
                    ],
                    hasNext: !cursor,
                    nextCursor: cursor ? null : `cursor-${sort}`,
                },
                error: null,
            },
        });
    });
    await page.goto("/search?keyword=카메라");
    await expect(page.getByRole("combobox", { name: "정렬 기준" })).toContainText("최신순");
    await expect
        .poll(() => requests.some((params) => params.get("cursor") === "cursor-LATEST"))
        .toBe(true);
    await page.getByRole("checkbox", { name: "판매중", exact: true }).check();
    await expect.poll(() => requests.at(-1)?.getAll("status")).toEqual(["ON_SALE"]);
    for (const [label, sort] of [
        ["추천순", "RECOMMENDED"],
        ["관심순", "INTEREST"],
        ["높은 가격순", "PRICE_HIGH"],
        ["낮은 가격순", "PRICE_LOW"],
        ["최신순", "LATEST"],
    ]) {
        const previousCount = requests.length;
        await page.getByRole("combobox", { name: "정렬 기준" }).click();
        await page.getByRole("option", { name: label, exact: true }).click();
        await expect
            .poll(() =>
                requests
                    .slice(previousCount)
                    .some((params) => params.get("sort") === sort && !params.has("cursor")),
            )
            .toBe(true);
        await expect(
            page.getByRole("heading", { name: `${sort} 상품 1`, exact: true }),
        ).toBeVisible();
        await expect
            .poll(() =>
                requests
                    .slice(previousCount)
                    .some((params) => params.get("cursor") === `cursor-${sort}`),
            )
            .toBe(true);
        const firstRequest = requests.slice(previousCount).find((params) => !params.has("cursor"))!;
        expect(firstRequest.get("keyword")).toBe("카메라");
        expect(firstRequest.getAll("status")).toEqual(["ON_SALE"]);
        expect(firstRequest.get("size")).toBe("20");
    }
});

test("search filters send platform, prices, conditions and keywords across cursor pages", async ({
    page,
}) => {
    const requests: URLSearchParams[] = [];
    await page.route("**/products?*", (route) => {
        const params = new URL(route.request().url()).searchParams;
        requests.push(params);
        return route.fulfill({
            json: {
                success: true,
                data: {
                    content: [
                        {
                            ...product,
                            id: params.has("cursor") ? 2 : 1,
                            title: params.has("excludeKeyword")
                                ? "제외 조건 API 결과"
                                : product.title,
                        },
                    ],
                    hasNext: !params.has("cursor"),
                    nextCursor: params.has("cursor") ? null : "filtered-next",
                },
                error: null,
            },
        });
    });
    await page.goto("/search");
    await expect.poll(() => requests.some((params) => params.has("cursor"))).toBe(true);
    await page.getByRole("checkbox", { name: "번개장터", exact: true }).check();
    await expect.poll(() => requests.at(-1)?.getAll("platform")).toEqual(["BUNJANG"]);
    await page.getByRole("checkbox", { name: "지금이니", exact: true }).check();
    await expect.poll(() => requests.at(-1)?.getAll("platform")).toEqual(["BUNJANG", "OUR"]);
    await expect(page.getByRole("checkbox", { name: "번개장터", exact: true })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "전체", exact: true })).not.toBeChecked();
    await page.getByRole("checkbox", { name: "번개장터", exact: true }).uncheck();
    await expect.poll(() => requests.at(-1)?.getAll("platform")).toEqual(["OUR"]);
    await page.getByRole("checkbox", { name: "전체", exact: true }).check();
    await expect.poll(() => requests.at(-1)?.has("platform")).toBe(false);
    await expect(page.getByRole("checkbox", { name: "지금이니", exact: true })).not.toBeChecked();
    await page.getByRole("checkbox", { name: "지금이니", exact: true }).check();
    await page.getByRole("checkbox", { name: "지금이니", exact: true }).uncheck();
    await expect.poll(() => requests.at(-1)?.has("platform")).toBe(false);
    await expect(page.getByRole("checkbox", { name: "전체", exact: true })).toBeChecked();
    await page.getByRole("checkbox", { name: "지금이니", exact: true }).check();
    await page.getByRole("checkbox", { name: "미개봉", exact: true }).check();
    await page.getByRole("checkbox", { name: "거의 새 상품", exact: true }).check();
    await expect.poll(() => requests.at(-1)?.getAll("condition")).toEqual(["S", "A"]);
    await page.getByRole("radio", { name: "10만~30만 원", exact: true }).check();
    await expect.poll(() => requests.at(-1)?.get("maxPrice")).toBe("300000");
    await page.getByRole("textbox", { name: "포함 키워드", exact: true }).fill("카메라");
    await page.getByRole("textbox", { name: "포함 키워드", exact: true }).press("Enter");
    await expect(page.getByRole("textbox", { name: "상품 검색" })).toHaveValue("카메라");
    const previousCount = requests.length;
    const excluded = page.getByRole("textbox", { name: "제외 키워드", exact: true });
    await excluded.fill("부품용, 고장");
    await excluded.press("Tab");
    await expect
        .poll(() =>
            requests
                .slice(previousCount)
                .some(
                    (params) =>
                        params.has("cursor") && params.get("excludeKeyword") === "부품용, 고장",
                ),
        )
        .toBe(true);
    const filteredRequests = requests
        .slice(previousCount)
        .filter((params) => params.get("excludeKeyword") === "부품용, 고장");
    expect(filteredRequests[0]?.has("cursor")).toBe(false);
    for (const params of filteredRequests) {
        expect(params.get("keyword")).toBe("카메라");
        expect(params.get("excludeKeyword")).toBe("부품용, 고장");
        expect(params.getAll("platform")).toEqual(["OUR"]);
        expect(params.getAll("condition")).toEqual(["S", "A"]);
        expect(params.get("minPrice")).toBe("100000");
        expect(params.get("maxPrice")).toBe("300000");
    }
    await expect(page.getByRole("heading", { name: "제외 조건 API 결과" })).toHaveCount(2);
    await page.getByRole("combobox", { name: "정렬 기준" }).click();
    await page.getByRole("option", { name: "낮은 가격순", exact: true }).click();
    await expect.poll(() => requests.at(-1)?.get("sort")).toBe("PRICE_LOW");
    expect(requests.at(-1)?.get("excludeKeyword")).toBe("부품용, 고장");
    await page.getByRole("spinbutton", { name: "최소 가격", exact: true }).fill("400000");
    await page.getByRole("spinbutton", { name: "최소 가격", exact: true }).press("Enter");
    await expect(
        page.getByRole("complementary", { name: "검색 필터" }).getByRole("alert"),
    ).toHaveText("최대 가격은 최소 가격 이상으로 입력해 주세요.");
    expect(requests.at(-1)?.get("minPrice")).toBe("100000");
    await page.getByRole("spinbutton", { name: "최소 가격", exact: true }).fill("0");
    await page.getByRole("spinbutton", { name: "최소 가격", exact: true }).press("Enter");
    await expect.poll(() => requests.at(-1)?.get("minPrice")).toBe("0");
    await excluded.fill("");
    await excluded.press("Enter");
    await expect.poll(() => requests.at(-1)?.has("excludeKeyword")).toBe(false);
});

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
                              nextCursor: hasCursor ? null : "1789843458645",
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
