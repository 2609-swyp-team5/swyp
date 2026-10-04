import { expect, test } from "./fixtures";

test("wishlist uses server counts, cursor pages and status filtering", async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "interest-token" }, error: null },
        }),
    );
    const createInterest = (interestId: number, title: string, interestStatus: string) => ({
        interestId,
        source: "EXTERNAL",
        targetId: interestId,
        title,
        price: 1000,
        status: interestId === 1002 ? "RESERVED" : "ON_SALE",
        condition: null,
        categoryName: "전자기기",
        thumbnailUrl: null,
        recommendation: interestStatus,
        interestStatus,
        marketAveragePrice: null,
        platformName: "번개장터",
        externalUrl: null,
        targetPrice: null,
        createdAt: "2026-10-04T10:00:00",
    });
    const first = createInterest(1001, "첫 번째 관심상품", "BUY");
    const second = createInterest(1002, "예약중 관심상품", "BUY");
    const waiting = createInterest(1003, "구매 대기 관심상품", "WAIT");
    const requests: URL[] = [];
    await page.route(
        (url) => url.pathname === "/interests",
        (route) => {
            const url = new URL(route.request().url());
            requests.push(url);
            const isWaiting = url.searchParams.get("status") === "WAIT";
            const isNextPage = url.searchParams.get("cursor") === "1001";
            return route.fulfill({
                json: {
                    success: true,
                    data: {
                        content: isWaiting ? [waiting] : isNextPage ? [second, waiting] : [first],
                        nextCursor: isWaiting || isNextPage ? null : "1001",
                        hasNext: !isWaiting && !isNextPage,
                        totalCount: isWaiting ? 1 : 3,
                        statusCounts: { BUY: 2, WAIT: 1, PENDING: 0, SOLD_OUT: 0 },
                    },
                    error: null,
                },
            });
        },
    );
    await page.goto("/buy/wishlist");
    await expect(page.getByRole("tab", { name: "전체 3", exact: true })).toBeVisible();
    await expect(page.locator("main").getByText(first.title, { exact: true })).toBeVisible();
    await expect(page.locator("main").getByText(second.title, { exact: true })).toBeVisible();
    expect(requests.some((url) => url.searchParams.get("cursor") === "1001")).toBe(true);
    expect(requests.every((url) => url.searchParams.get("size") === "20")).toBe(true);
    await page.getByRole("tab", { name: "구매 대기 1", exact: true }).click();
    await expect(page.locator("main").getByText(waiting.title, { exact: true })).toBeVisible();
    await expect(page.locator("main").getByText(first.title, { exact: true })).toHaveCount(0);
    expect(requests.some((url) => url.searchParams.get("status") === "WAIT")).toBe(true);
    await expect(page.getByRole("tab", { name: "전체 3", exact: true })).toBeVisible();
});
