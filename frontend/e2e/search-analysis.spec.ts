import { expect, test } from "./fixtures";
import { detailProduct } from "./product-detail-fixture";
import {
    createProductCompetitionMock,
    createProductMarketAnalysisMock,
    createProductPriceTrendMock,
    createProductSummaryMock,
    createProductValuationForecastMock,
} from "../src/features/product-management/mocks/productManagementMock";

test("detail loads buyer analysis only on click and retries failed analysis", async ({ page }) => {
    const productId = 77;
    const result = createProductMarketAnalysisMock(productId, "BUY", "BUY");
    const similar = createProductCompetitionMock(productId, "BUY");
    let requests = 0;
    let fail = true;
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
        release = resolve;
    });
    let releaseProduct!: () => void;
    const productReady = new Promise<void>((resolve) => {
        releaseProduct = resolve;
    });
    await page.route(`**/products/${productId}`, async (route) => {
        await productReady;
        return route.fulfill({
            json: { success: true, data: { ...detailProduct, id: productId }, error: null },
        });
    });
    // 분석 조회는 ?perspective=BUY 쿼리가 붙어 경로만 비교한다
    await page.route(
        (url) => url.pathname === `/products/${productId}/analysis`,
        async (route) => {
            requests++;
            expect(route.request().method()).toBe("GET");
            expect(new URL(route.request().url()).searchParams.get("perspective")).toBe("BUY");
            if (fail) {
                await ready;
                return route.fulfill({
                    status: 500,
                    json: { success: false, message: "분석 조회 실패", data: null, error: null },
                });
            }
            return route.fulfill({ json: { success: true, data: result, error: null } });
        },
    );
    await page.route(`**/products/${productId}/analysis/trend`, (route) => {
        requests++;
        return route.fulfill({
            json: {
                success: true,
                data: createProductPriceTrendMock(productId),
                error: null,
            },
        });
    });
    await page.route(`**/products/${productId}/analysis/forecast`, (route) => {
        requests++;
        return route.fulfill({
            json: {
                success: true,
                data: createProductValuationForecastMock(productId),
                error: null,
            },
        });
    });
    await page.route(`**/products/${productId}/competition`, async (route) => {
        requests++;
        expect(route.request().method()).toBe("GET");
        if (fail) {
            await ready;
            return route.fulfill({
                status: 500,
                json: { success: false, message: "비슷한 상품 조회 실패", data: null, error: null },
            });
        }
        return route.fulfill({ json: { success: true, data: similar, error: null } });
    });
    await page.goto(`/search/${productId}`);
    const button = page.getByRole("button", { name: "AI 분석 보기", exact: true });
    await expect(page.getByText("상품 정보를 불러오는 중입니다.")).toBeVisible();
    await expect(button).toHaveCount(0);
    await expect(page.getByText("AI가 시세 분석과 거래 타이밍을 종합해 알려드려요.")).toHaveCount(
        0,
    );
    releaseProduct();
    await expect(button).toBeEnabled();
    await page.route(`**/products/${productId}/summary`, (route) =>
        route.fulfill({
            json: { success: true, data: createProductSummaryMock(productId), error: null },
        }),
    );
    expect(requests).toBe(0);
    await expect(page.getByRole("heading", { name: "AI 시세 분석", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "비슷한 상품", exact: true })).toHaveCount(0);
    await button.click();
    await expect(page.getByLabel("AI 시세 분석을 불러오는 중")).toBeVisible();
    await expect(page.getByRole("button", { name: "분석 불러오는 중" })).toBeDisabled();
    release();
    await expect(page.locator("main")).toContainText("시세 분석 데이터를 불러오지 못했습니다.");
    await expect(page.locator("main")).toContainText("경쟁 상품 데이터를 불러오지 못했습니다.");
    fail = false;
    await page.getByRole("button", { name: "AI 분석 다시 조회", exact: true }).click();
    const section = page.getByRole("region", { name: "AI 시세 분석", exact: true });
    await expect(section).toContainText(result.description);
    await expect(section).toContainText("구매 고려 가격");
    const similarSection = page.getByRole("region", { name: "비슷한 상품", exact: true });
    await expect(similarSection).toContainText(similar.competition.items[0].title);
    await expect(similarSection.getByRole("link").first()).toHaveAttribute(
        "href",
        similar.competition.items[0].productUrl,
    );
    await expect(page.getByRole("button", { name: "AI 분석 다시 조회" })).toHaveCount(0);
    await expect(button).toBeEnabled();
    await page.route(
        (url) => url.pathname === "/interests",
        (route) =>
            route.fulfill({
                json: {
                    success: true,
                    data: {
                        content: [
                            {
                                source: "EXTERNAL",
                                targetId: productId,
                                interestId: 1001,
                                title: detailProduct.title,
                                price: detailProduct.price,
                                status: "ON_SALE",
                                condition: "A",
                                categoryName: "전자기기",
                                thumbnailUrl: null,
                                recommendation: "BUY",
                                interestStatus: "BUY",
                                marketAveragePrice: null,
                                platformName: "번개장터",
                                externalUrl: null,
                                targetPrice: null,
                                createdAt: "2026-10-04T10:00:00",
                            },
                        ],
                        nextCursor: null,
                        hasNext: false,
                        totalCount: 1,
                        statusCounts: { BUY: 1, WAIT: 0, PENDING: 0, SOLD_OUT: 0 },
                    },
                    error: null,
                },
            }),
    );
    const previousRequests = requests;
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "analysis-token" }, error: null },
        }),
    );
    await page.goto("/buy/wishlist?selected=1001");
    await expect(page.getByRole("region", { name: "AI 시세 분석", exact: true })).toContainText(
        result.description,
    );
    await expect(page.getByRole("region", { name: "비슷한 상품", exact: true })).toContainText(
        similar.competition.items[0].title,
    );
    expect(requests).toBeGreaterThan(previousRequests);
});
