import { expect, test } from "./fixtures";
import { homeSummary, emptyHomeSummary } from "./home-summary-fixture";

test("home summary uses API counts, positive price difference and today's analysis", async ({
    page,
}) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "home-summary-token" }, error: null },
        }),
    );
    const today = new Date();
    const analyzedAt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}T09:12:00`;
    await page.route("**/home/summary", (route) => {
        expect(route.request().headers().authorization).toBe("Bearer home-summary-token");
        return route.fulfill({
            json: {
                success: true,
                data: { ...homeSummary, marketPriceDiffRate: 4.1, lastAnalyzedAt: analyzedAt },
                error: null,
            },
        });
    });
    await page.goto("/home");
    const summary = page.getByRole("region", { name: "나의 거래 요약", exact: true });
    await expect(summary).toContainText("6개");
    await expect(summary).toContainText("임시저장 2 · 판매중 2 · 판매완료 1");
    await expect(summary).toContainText("3건");
    await expect(summary).toContainText("+4.1%");
    await expect(summary.getByText("오늘", { exact: true })).toBeVisible();
});

test("home summary retries failures and does not substitute sample values", async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "home-summary-token" }, error: null },
        }),
    );
    let requests = 0;
    await page.route("**/home/summary", (route) =>
        route.fulfill({
            json:
                ++requests === 1
                    ? { success: false, message: "요약 조회 실패", data: null, error: null }
                    : { success: true, data: emptyHomeSummary, error: null },
        }),
    );
    await page.goto("/home");
    const summary = page.getByRole("region", { name: "나의 거래 요약", exact: true });
    await expect(summary.getByRole("alert")).toHaveText("요약 조회 실패");
    await expect(summary).not.toContainText("6개");
    await summary.getByRole("button", { name: "다시 시도", exact: true }).click();
    await expect(summary).toContainText("0개");
    await expect(summary).toContainText("0건");
    await expect(summary).toContainText("분석된 물건이 없습니다.");
    await expect(summary).toContainText("아직 분석 이력이 없습니다.");
});

test("guests do not request the member summary", async ({ page }) => {
    let requests = 0;
    page.on("request", (request) => {
        if (new URL(request.url()).pathname === "/home/summary") requests++;
    });
    await page.goto("/home");
    await expect(page.getByRole("heading", { name: "상품 일반 검색", exact: true })).toBeVisible();
    expect(requests).toBe(0);
});
