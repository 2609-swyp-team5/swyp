import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { detailProduct } from "./product-detail-fixture";
import {
    createProductCompetitionMock,
    createProductMarketAnalysisMock,
    createProductPriceDistributionMock,
    createProductPriceTrendMock,
    createProductValuationForecastMock,
} from "../src/features/product-management/mocks/productManagementMock";

async function mockDetailAnalysis(
    page: Page,
    productId: number,
    {
        member,
        hasAnalysis = true,
        prices,
    }: {
        member: boolean;
        hasAnalysis?: boolean;
        prices?: {
            minPrice: number;
            averagePrice: number;
            suggestedPrice: number;
            maxPrice: number;
        };
    },
) {
    const result = { ...createProductMarketAnalysisMock(productId, "BUY", "BUY"), ...prices };
    const baseDistribution = createProductPriceDistributionMock(productId);
    const distribution = {
        ...baseDistribution,
        onSale: { ...baseDistribution.onSale, ...prices },
    };
    const similar = createProductCompetitionMock(productId, "BUY");
    const calls = { analysis: 0, details: 0, requested: 0 };
    let analyzed = hasAnalysis;

    if (member) {
        await page.route("**/auth/refresh", (route) =>
            route.fulfill({
                json: { success: true, data: { accessToken: "analysis-member" }, error: null },
            }),
        );
        await page.route(
            (url) => url.pathname === "/interests",
            (route) =>
                route.fulfill({
                    json: {
                        success: true,
                        data: { content: [], hasNext: false, nextCursor: null },
                        error: null,
                    },
                }),
        );
    }
    await page.route(`**/products/${productId}`, (route) =>
        route.fulfill({
            json: { success: true, data: { ...detailProduct, id: productId }, error: null },
        }),
    );
    // 분석 조회(GET, ?perspective=BUY)와 분석 요청(POST)은 같은 경로라 메서드로 나눈다
    await page.route(
        (url) => url.pathname === `/products/${productId}/analysis`,
        (route) => {
            if (route.request().method() === "POST") {
                calls.requested++;
                analyzed = true;
                return route.fulfill({
                    json: {
                        success: true,
                        data: {
                            productId,
                            analysisStatus: "ANALYZING",
                            analysisSkipReason: null,
                            analysisSkipMessage: null,
                        },
                        error: null,
                    },
                });
            }
            calls.analysis++;
            expect(new URL(route.request().url()).searchParams.get("perspective")).toBe("BUY");
            return route.fulfill({
                json: {
                    success: true,
                    // 분석 이력이 없으면 분석 필드가 null로 내려온다
                    data: analyzed ? result : { ...result, analysisId: null, recommendation: null },
                    error: null,
                },
            });
        },
    );
    await page.route(
        (url) => url.pathname === `/products/${productId}/analysis/stream`,
        (route) => {
            expect(new URL(route.request().url()).searchParams.get("perspective")).toBe("BUY");
            const events = [
                {
                    success: true,
                    message: "AI가 같은 물건을 고르고 시세를 판단하고 있어요.",
                    data: {
                        event: "step",
                        step: "AI_ANALYSIS",
                        status: "START",
                        index: 2,
                        total: 5,
                    },
                    error: null,
                },
                {
                    success: true,
                    message: "시세 분석이 완료되었어요.",
                    data: {
                        event: "complete",
                        ...result,
                        analysisStatus: "ANALYZED",
                        analysisSkipReason: null,
                        analysisSkipMessage: null,
                    },
                    error: null,
                },
            ];
            return route.fulfill({
                status: 200,
                headers: { "Content-Type": "text/event-stream" },
                body: `${events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("")}`,
            });
        },
    );
    await page.route(`**/products/${productId}/analysis/trend`, (route) => {
        calls.details++;
        return route.fulfill({
            json: { success: true, data: createProductPriceTrendMock(productId), error: null },
        });
    });
    await page.route(
        (url) => url.pathname === `/products/${productId}/analysis/distribution`,
        (route) => {
            calls.details++;
            return route.fulfill({
                json: { success: true, data: distribution, error: null },
            });
        },
    );
    await page.route(`**/products/${productId}/analysis/forecast`, (route) => {
        calls.details++;
        return route.fulfill({
            json: {
                success: true,
                data: createProductValuationForecastMock(productId),
                error: null,
            },
        });
    });
    await page.route(`**/products/${productId}/competition`, (route) => {
        calls.details++;
        return route.fulfill({ json: { success: true, data: similar, error: null } });
    });
    return { calls, result, similar };
}

test("guests see the AI analysis button and get the login notice instead of analysis", async ({
    page,
}) => {
    const productId = 76;
    const { calls } = await mockDetailAnalysis(page, productId, { member: false });
    await page.goto(`/search/${productId}`);

    const button = page.getByRole("button", { name: "AI 분석 보기", exact: true });
    await expect(button).toBeEnabled();
    await expect(page.getByText("AI가 시세 분석과 거래 타이밍을 종합해 알려드려요.")).toBeVisible();
    await button.click();

    const dialog = page.getByRole("alertdialog", { name: "로그인이 필요합니다" });
    await expect(dialog).toBeVisible();
    expect(calls.analysis + calls.details).toBe(0);
    await dialog.getByRole("button", { name: "확인", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
});

test("members see the shared AI analysis right away and load details only from 더보기", async ({
    page,
}) => {
    const productId = 77;
    const { calls, result, similar } = await mockDetailAnalysis(page, productId, {
        member: true,
    });
    await page.goto(`/search/${productId}`);

    await expect(page.getByRole("button", { name: "AI 분석 보기", exact: true })).toHaveCount(0);
    const section = page.getByRole("region", { name: "AI 시세 분석", exact: true });
    await expect(section).toContainText(result.description);
    expect(calls.details).toBe(0);

    await page.getByRole("button", { name: /상세 시세 분석 보기/ }).click();
    await expect(page.getByRole("region", { name: "경쟁 상품 수", exact: true })).toContainText(
        similar.competition.items[0].title,
    );
    expect(calls.details).toBe(4);
});

test("price distribution keeps every point inside the bar when the suggested price is below the lowest", async ({
    page,
}) => {
    const productId = 79;
    await mockDetailAnalysis(page, productId, {
        member: true,
        prices: { minPrice: 20000, averagePrice: 24000, suggestedPrice: 19000, maxPrice: 27000 },
    });
    await page.goto(`/search/${productId}`);
    await page.getByRole("button", { name: /상세 시세 분석 보기/ }).click();

    const card = page.locator('[data-slot="card"]', { hasText: "거래 가격 분포" });
    await expect(card).toBeVisible();
    const cardBox = await card.boundingBox();
    const boxes = new Map<string, NonNullable<typeof cardBox>>();
    for (const key of ["min", "average", "max", "suggested"]) {
        const box = await card.getByTestId(`price-distribution-point-${key}`).boundingBox();
        expect(box, key).not.toBeNull();
        expect(box!.x, key).toBeGreaterThanOrEqual(cardBox!.x);
        expect(box!.x + box!.width, key).toBeLessThanOrEqual(cardBox!.x + cardBox!.width);
        boxes.set(key, box!);
    }
    const centerOf = (key: string) => boxes.get(key)!.x + boxes.get(key)!.width / 2;
    expect(centerOf("suggested")).toBeLessThan(centerOf("min"));
    expect(centerOf("min")).toBeLessThan(centerOf("average"));
    expect(centerOf("average")).toBeLessThan(centerOf("max"));
    const labels = { min: "최저", average: "평균", max: "최고" } as const;
    for (const [key, label] of Object.entries(labels)) {
        const labelBox = await card.getByText(label, { exact: true }).boundingBox();
        const tickBox = await card.getByTestId(`price-distribution-tick-${key}`).boundingBox();
        // 눈금선·점·라벨이 같은 세로줄에 있어야 한다
        expect(Math.abs(tickBox!.x + tickBox!.width / 2 - centerOf(key)), key).toBeLessThan(1);
        expect(Math.abs(labelBox!.x + labelBox!.width / 2 - centerOf(key)), key).toBeLessThan(1);
    }
});

test("members can request an analysis when none exists yet", async ({ page }) => {
    const productId = 78;
    const { calls, result } = await mockDetailAnalysis(page, productId, {
        member: true,
        hasAnalysis: false,
    });
    await page.goto(`/search/${productId}`);

    const section = page.getByRole("region", { name: "AI 시세 분석", exact: true });
    await expect(section).toContainText("구매 타이밍을 분석하고 있어요");
    await section.getByRole("button", { name: "AI 분석 재시도" }).click();

    const completedDialog = page.getByRole("dialog", { name: "시세 분석이 완료됐어요" });
    await expect(completedDialog).toBeVisible();
    await completedDialog.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(completedDialog).toBeHidden();
    await expect(section).toContainText(result.description);
    expect(calls.requested).toBe(1);
});
