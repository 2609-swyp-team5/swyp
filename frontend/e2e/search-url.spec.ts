import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

async function recordSearches(page: Page) {
    const requests: URLSearchParams[] = [];
    await page.route("**/products?*", (route) => {
        const params = new URL(route.request().url()).searchParams;
        requests.push(params);
        return route.fulfill({
            json: {
                success: true,
                data: { content: [], nextCursor: null, hasNext: false, totalCount: 0 },
                error: null,
            },
        });
    });
    return requests;
}

test("search keyword, sort and filters are kept in the URL and restored on reload", async ({
    page,
}) => {
    const requests = await recordSearches(page);
    await page.goto("/search");
    const input = page.getByRole("search").getByRole("textbox", { name: "상품 검색" });
    await input.fill("아이폰");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/search\?keyword=%EC%95%84%EC%9D%B4%ED%8F%B0$/);

    await page.getByRole("combobox", { name: "정렬 기준" }).click();
    await page.getByRole("option", { name: "낮은 가격순", exact: true }).click();
    await page.getByRole("checkbox", { name: "판매중", exact: true }).check();
    await page.getByRole("checkbox", { name: "번개장터", exact: true }).check();
    await page.getByRole("checkbox", { name: "중고나라", exact: true }).check();
    // 연달아 바꿔도 마지막 상태가 URL에 남는다
    await expect
        .poll(() => new URL(page.url()).searchParams.getAll("platform"))
        .toEqual(["BUNJANG", "JOONGNA"]);
    const url = new URL(page.url()).searchParams;
    expect(url.get("keyword")).toBe("아이폰");
    expect(url.get("sort")).toBe("PRICE_LOW");
    expect(url.getAll("status")).toEqual(["ON_SALE"]);

    await page.reload();
    await expect(input).toHaveValue("아이폰");
    await expect(page.getByRole("combobox", { name: "정렬 기준" })).toContainText("낮은 가격순");
    await expect(page.getByRole("checkbox", { name: "판매중", exact: true })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "번개장터", exact: true })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "중고나라", exact: true })).toBeChecked();
    const last = requests.at(-1)!;
    expect(last.get("keyword")).toBe("아이폰");
    expect(last.get("sort")).toBe("PRICE_LOW");
    expect(last.getAll("status")).toEqual(["ON_SALE"]);
    expect(last.getAll("platform")).toEqual(["BUNJANG", "JOONGNA"]);
});

test("going back returns to the previous search keyword", async ({ page }) => {
    const requests = await recordSearches(page);
    await page.goto("/search?keyword=카메라");
    const input = page.getByRole("search").getByRole("textbox", { name: "상품 검색" });
    await expect(input).toHaveValue("카메라");
    await input.fill("아이패드");
    await input.press("Enter");
    await expect.poll(() => requests.at(-1)?.get("keyword")).toBe("아이패드");
    await expect.poll(() => new URL(page.url()).searchParams.get("keyword")).toBe("아이패드");

    await page.goBack();
    await expect.poll(() => new URL(page.url()).searchParams.get("keyword")).toBe("카메라");
    await expect(input).toHaveValue("카메라");
    await expect.poll(() => requests.at(-1)?.get("keyword")).toBe("카메라");
});

test("invalid URL values are ignored when searching", async ({ page }) => {
    const requests = await recordSearches(page);
    await page.goto(
        "/search?keyword=노트북&sort=WRONG&platform=BUNJANG&platform=JOONGNA&platform=NOPE&minPrice=abc",
    );
    await expect.poll(() => requests.length).toBeGreaterThan(0);
    const last = requests.at(-1)!;
    expect(last.get("keyword")).toBe("노트북");
    expect(last.get("sort")).toBe("LATEST");
    expect(last.getAll("platform")).toEqual(["BUNJANG", "JOONGNA"]);
    expect(last.has("minPrice")).toBe(false);
});

test("trade status allows several choices with reserved, and defect filters explain that external listings drop out", async ({
    page,
}) => {
    const requests = await recordSearches(page);
    await page.goto("/search?keyword=카메라");

    await page.getByRole("checkbox", { name: "판매중", exact: true }).check();
    await page.getByRole("checkbox", { name: "판매완료", exact: true }).check();
    await page.getByRole("checkbox", { name: "예약중", exact: true }).check();
    // 새로 체크해도 앞의 선택이 풀리지 않는다(판매중+판매완료로 실제 팔린 가격과 비교)
    await expect
        .poll(() => new URL(page.url()).searchParams.getAll("status"))
        .toEqual(["ON_SALE", "SOLD_OUT", "RESERVED"]);

    const note = page.getByRole("note");
    await expect(note).toHaveCount(0);
    await page.getByRole("checkbox", { name: "하자 없음", exact: true }).check();
    await expect
        .poll(() => new URL(page.url()).searchParams.getAll("defectStatus"))
        .toEqual(["NORMAL"]);
    await expect(note).toContainText("지금이니?! 상품만 보여요");
    await expect.poll(() => requests.at(-1)?.getAll("defectStatus")).toEqual(["NORMAL"]);
    expect(requests.at(-1)?.getAll("status")).toEqual(["ON_SALE", "SOLD_OUT", "RESERVED"]);

    await page.getByRole("checkbox", { name: "판매중", exact: true }).uncheck();
    await expect
        .poll(() => new URL(page.url()).searchParams.getAll("status"))
        .toEqual(["SOLD_OUT", "RESERVED"]);
    await page.getByRole("checkbox", { name: "하자 없음", exact: true }).uncheck();
    await expect(note).toHaveCount(0);
});

test("the detail page goes back to the search with the same conditions", async ({ page }) => {
    await page.route("**/products?*", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: {
                    content: [
                        {
                            source: "EXTERNAL",
                            id: 1,
                            title: "필름카메라 FM2",
                            price: 300000,
                            status: "ON_SALE",
                            condition: null,
                            defectStatus: null,
                            thumbnailUrl: null,
                            platformName: "번개장터",
                            marketAveragePrice: null,
                            categoryName: "카메라",
                            createdAt: "2026-10-16T10:00:00",
                            favorite: false,
                            interestId: null,
                        },
                    ],
                    nextCursor: null,
                    hasNext: false,
                    totalCount: 1,
                },
                error: null,
            },
        }),
    );
    await page.goto("/search?keyword=FM2&sort=PRICE_LOW&status=ON_SALE&status=SOLD_OUT");
    await page.getByRole("link", { name: "필름카메라 FM2 상세보기" }).click();
    await expect(page).toHaveURL(/\/search\/1$/);

    await page.getByRole("link", { name: "이전 페이지" }).click();
    await expect(page).toHaveURL(/\/search\?/);
    const params = new URL(page.url()).searchParams;
    expect(params.get("keyword")).toBe("FM2");
    expect(params.get("sort")).toBe("PRICE_LOW");
    expect(params.getAll("status")).toEqual(["ON_SALE", "SOLD_OUT"]);
});
