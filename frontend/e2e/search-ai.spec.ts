import { expect, test } from "./fixtures";
import type { SearchResultItem } from "../src/features/search/types";

const product: SearchResultItem = {
    source: "OUR",
    id: 41,
    title: "AI 검색 아이폰 첫 상품",
    brand: null,
    price: 300000,
    status: "ON_SALE",
    condition: "A",
    defectStatus: "NORMAL",
    purchasedMonths: null,
    categoryName: "전자기기",
    tradeRegion: null,
    deliveryAvailable: true,
    thumbnailUrl: null,
    recommendation: null,
    marketAveragePrice: null,
    platformName: null,
    externalUrl: null,
    createdAt: "2026-10-04T10:00:00",
};

const condition = {
    keyword: "아이폰",
    excludeKeyword: "깨짐",
    tradeStatus: ["SELLING"],
    platform: ["OUR"],
    minPrice: null,
    maxPrice: 500000,
    condition: ["A"],
    defectStatus: ["NORMAL"],
    sort: "PRICE_LOW",
};
const result = { content: [], nextCursor: null, hasNext: false };

test("home AI search forwards the sentence and runs the same API once on search", async ({
    page,
}) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: { accessToken: "home-ai-token" },
                error: null,
            },
        }),
    );
    await page.route("**/products/popular", (route) =>
        route.fulfill({ json: { success: true, data: [], error: null } }),
    );
    let aiCalls = 0;
    const generalRequests: URL[] = [];
    await page.route("**/products?*", (route) => {
        generalRequests.push(new URL(route.request().url()));
        return route.fulfill({ json: { success: true, data: result, error: null } });
    });
    await page.route("**/products/analysis/search?*", (route) => {
        aiCalls++;
        expect(new URL(route.request().url()).searchParams.get("query")).toBe(
            "아이폰 50만원 이하 싼 순으로",
        );
        expect(route.request().headers().authorization).toBe("Bearer home-ai-token");
        return route.fulfill({
            json: {
                success: true,
                data: { aiApplied: true, condition, result: { ...result, content: [product] } },
                error: null,
            },
        });
    });
    await page.goto("/home");
    await expect(page.getByRole("heading", { name: /안녕하세요/ })).toBeVisible();
    await page
        .getByRole("group", { name: "검색 방식" })
        .getByRole("button", { name: "AI 검색", exact: true })
        .click();
    const input = page.getByRole("textbox", { name: "홈 상품 검색어" });
    await input.press("Enter");
    await expect(
        page.getByText("AI 검색어를 1~200자로 입력해 주세요.", { exact: true }),
    ).toBeVisible();
    await input.fill("아이폰 50만원 이하 싼 순으로");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/search\?keyword=.*&mode=ai$/);
    await expect(page.getByText(product.title, { exact: true })).toBeVisible();
    await expect(
        page.getByRole("search").getByRole("button", { name: "AI 검색", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(aiCalls).toBe(1);
    expect(generalRequests).toHaveLength(0);
});

test("guest home AI search uses the login notice without navigation or an API request", async ({
    page,
}) => {
    await page.route("**/products/popular", (route) =>
        route.fulfill({ json: { success: true, data: [], error: null } }),
    );
    let aiCalls = 0;
    await page.route("**/products/analysis/search?*", (route) => {
        aiCalls++;
        return route.fulfill({ status: 401 });
    });
    await page.goto("/home");
    await page
        .getByRole("group", { name: "검색 방식" })
        .getByRole("button", { name: "AI 검색", exact: true })
        .click();
    await page.getByRole("textbox", { name: "홈 상품 검색어" }).fill("아이폰");
    await page.getByRole("button", { name: "AI 검색", exact: true }).last().click();
    await expect(page.getByRole("alertdialog")).toContainText("로그인이 필요합니다");
    await expect(page).toHaveURL(/\/home$/);
    expect(aiCalls).toBe(0);
});

test("AI search uses the returned first page and conditions for pagination and sorting", async ({
    page,
}) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "ai-search-token" }, error: null },
        }),
    );
    const requests: URL[] = [];
    await page.route("**/products?*", (route) => {
        const url = new URL(route.request().url());
        requests.push(url);
        return route.fulfill({
            json: {
                success: true,
                data: {
                    ...result,
                    content: url.searchParams.has("cursor")
                        ? [{ ...product, id: 42, title: "AI 검색 아이폰 다음 상품" }]
                        : [],
                },
                error: null,
            },
        });
    });
    const aiRequests: URL[] = [];
    await page.route("**/products/analysis/search?*", async (route) => {
        aiRequests.push(new URL(route.request().url()));
        expect(route.request().headers().authorization).toBe("Bearer ai-search-token");
        await new Promise((resolve) => setTimeout(resolve, 150));
        await route.fulfill({
            json: {
                success: true,
                data: {
                    aiApplied: true,
                    condition,
                    result: { content: [product], nextCursor: "ai-cursor", hasNext: true },
                },
                error: null,
            },
        });
    });
    await page.goto("/search");
    await expect.poll(() => requests.length).toBe(1);
    const form = page.getByRole("search");
    await form.getByRole("button", { name: "AI 검색", exact: true }).click();
    const input = form.getByRole("textbox", { name: "상품 검색" });
    await input.fill("아이폰 50만원 이하 하자 없는 거 싼 순으로");
    await input.press("Enter");
    await expect(page.getByText("AI가 검색 조건을 분석하고 있습니다.")).toBeVisible();
    await expect(page.getByText(product.title, { exact: true })).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: "최대 가격" })).toHaveValue("500000");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect
        .poll(() => requests.some((url) => url.searchParams.get("cursor") === "ai-cursor"))
        .toBe(true);
    await expect(page.getByText("AI 검색 아이폰 다음 상품", { exact: true })).toBeVisible();
    expect(aiRequests).toHaveLength(1);
    expect(aiRequests[0].searchParams.get("query")).toBe(
        "아이폰 50만원 이하 하자 없는 거 싼 순으로",
    );
    expect(aiRequests[0].searchParams.get("size")).toBe("20");
    const next = requests.find((url) => url.searchParams.get("cursor") === "ai-cursor")!;
    expect(next.searchParams.get("keyword")).toBe("아이폰");
    expect(next.searchParams.get("excludeKeyword")).toBe("깨짐");
    expect(next.searchParams.get("maxPrice")).toBe("500000");
    expect(next.searchParams.getAll("platform")).toEqual(["OUR"]);
    expect(next.searchParams.getAll("tradeStatus")).toEqual(["SELLING"]);
    expect(next.searchParams.getAll("condition")).toEqual(["A"]);
    expect(next.searchParams.getAll("defectStatus")).toEqual(["NORMAL"]);
    expect(next.searchParams.get("sort")).toBe("PRICE_LOW");
    // AI의 첫 페이지를 일반 API로 다시 조회하지 않는다.
    expect(
        requests.filter(
            (url) =>
                url.searchParams.get("keyword") === "아이폰" && !url.searchParams.has("cursor"),
        ),
    ).toHaveLength(0);
    await page.getByRole("combobox", { name: "정렬 기준" }).click();
    await page.getByRole("option", { name: "최신순", exact: true }).click();
    await expect
        .poll(() =>
            requests.some(
                (url) =>
                    url.searchParams.get("keyword") === "아이폰" &&
                    url.searchParams.get("sort") === "LATEST",
            ),
        )
        .toBe(true);
    expect(aiRequests).toHaveLength(1);
    await page.getByRole("checkbox", { name: "임시저장", exact: true }).check();
    await expect
        .poll(() =>
            requests.some(
                (url) =>
                    url.searchParams.get("status") === "DRAFT" &&
                    !url.searchParams.has("tradeStatus"),
            ),
        )
        .toBe(true);
});

test("AI search validates input, shows errors and allows retry with backend fallback", async ({
    page,
}) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "ai-search-token" }, error: null },
        }),
    );
    await page.route("**/products?*", (route) =>
        route.fulfill({ json: { success: true, data: result, error: null } }),
    );
    let calls = 0;
    await page.route("**/products/analysis/search?*", (route) => {
        calls++;
        return calls === 1
            ? route.fulfill({
                  status: 500,
                  json: { success: false, message: "분석 서버 오류", data: null, error: null },
              })
            : route.fulfill({
                  json: {
                      success: true,
                      data: { aiApplied: false, condition, result },
                      error: null,
                  },
              });
    });
    await page.goto("/search");
    const form = page.getByRole("search");
    const ai = form.getByRole("button", { name: "AI 검색", exact: true });
    const input = form.getByRole("textbox", { name: "상품 검색" });
    await ai.click();
    await input.press("Enter");
    await expect(page.getByText("AI 검색어를 1~200자로 입력해 주세요.")).toBeVisible();
    expect(calls).toBe(0);
    await input.fill("아이폰");
    await ai.click();
    await expect(page.getByRole("alert").filter({ hasText: "분석 서버 오류" })).toBeVisible();
    await ai.click();
    await expect(page.getByText("AI 해석이 어려워 입력한 문장으로 검색했습니다.")).toBeVisible();
    expect(calls).toBe(2);
});

test("guest AI search opens the existing login dialog without an AI request", async ({ page }) => {
    await page.route("**/products?*", (route) =>
        route.fulfill({ json: { success: true, data: result, error: null } }),
    );
    let calls = 0;
    await page.route("**/products/analysis/search?*", (route) => {
        calls++;
        return route.fulfill({ status: 401 });
    });
    await page.goto("/search");
    const form = page.getByRole("search");
    await form.getByRole("button", { name: "AI 검색", exact: true }).click();
    await form.getByRole("textbox", { name: "상품 검색" }).fill("아이폰");
    await form.getByRole("textbox", { name: "상품 검색" }).press("Enter");
    await expect(page.getByRole("alertdialog")).toContainText("로그인이 필요합니다");
    expect(calls).toBe(0);
});
