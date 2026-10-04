import { expect, test } from "./fixtures";

test("sell manage requests and renders the selected status tab", async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "sell-token" }, error: null },
        }),
    );

    const createProduct = (id: number, title: string, status: string) => ({
        id,
        title,
        brand: null,
        price: 1000,
        status,
        condition: "A",
        defectStatus: "NORMAL",
        purchasedMonths: 1,
        categoryName: "전자기기",
        thumbnailUrl: null,
        recommendation: null,
        marketAveragePrice: null,
        createdAt: "2026-10-04T10:00:00",
    });
    const onSale = createProduct(1001, "판매중 상품", "ON_SALE");
    const draft = createProduct(1002, "임시저장 상품", "DRAFT");
    const soldOut = createProduct(1003, "판매완료 상품", "SOLD_OUT");
    const requests: URL[] = [];

    await page.route(
        (url) => url.pathname === "/products/me",
        (route) => {
            const url = new URL(route.request().url());
            requests.push(url);
            const status = url.searchParams.get("status");
            const content = status === "DRAFT" ? [draft] : [onSale, draft, soldOut];

            if (status === "DRAFT") {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        void route.fulfill({
                            json: {
                                success: true,
                                data: {
                                    content,
                                    nextCursor: null,
                                    hasNext: false,
                                    totalCount: content.length,
                                    statusCounts: { DRAFT: 1, ON_SALE: 1, SOLD_OUT: 1 },
                                },
                                error: null,
                            },
                        });
                        resolve(undefined);
                    }, 250);
                });
            }

            return route.fulfill({
                json: {
                    success: true,
                    data: {
                        content,
                        nextCursor: null,
                        hasNext: false,
                        totalCount: content.length,
                        statusCounts: { DRAFT: 1, ON_SALE: 1, SOLD_OUT: 1 },
                    },
                    error: null,
                },
            });
        },
    );

    await page.goto("/sell/manage");
    await expect(page.getByRole("tab", { name: "전체 3", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "임시저장 1", exact: true }).click();
    await expect(page.getByRole("tab", { name: "전체 3", exact: true })).toBeVisible();
    await expect(page.getByText(draft.title, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(onSale.title, { exact: true })).toHaveCount(0);
    await expect(page.getByText(soldOut.title, { exact: true })).toHaveCount(0);
    expect(requests.some((url) => url.searchParams.get("status") === "DRAFT")).toBe(true);
});
