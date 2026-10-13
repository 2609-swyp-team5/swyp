import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { detailProduct } from "./product-detail-fixture";
import {
    createProductCompetitionMock,
    createProductMarketAnalysisMock,
    createProductPriceTrendMock,
    createProductValuationForecastMock,
} from "../src/features/product-management/mocks/productManagementMock";

async function mockDetailAnalysis(
    page: Page,
    productId: number,
    { member, hasAnalysis = true }: { member: boolean; hasAnalysis?: boolean },
) {
    const result = createProductMarketAnalysisMock(productId, "BUY", "BUY");
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
    await page.route(`**/products/${productId}/analysis/trend`, (route) => {
        calls.details++;
        return route.fulfill({
            json: { success: true, data: createProductPriceTrendMock(productId), error: null },
        });
    });
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
    expect(calls.details).toBe(3);
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

    await expect(section).toContainText(result.description);
    expect(calls.requested).toBe(1);
});
