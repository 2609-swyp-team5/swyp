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
