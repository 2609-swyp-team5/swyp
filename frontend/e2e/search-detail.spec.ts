import { expect, test } from "./fixtures";
import { detailProduct } from "./product-detail-fixture";

test.beforeEach(async ({ page }) => {
    await page.route("**/products/1", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: detailProduct,
                error: null,
            },
        }),
    );
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "detail-token" }, error: null },
        }),
    );
    let content: { source: string; targetId: number; interestId: number }[] = [];
    await page.route(
        (url) => url.pathname === "/interests",
        (route) => {
            if (route.request().method() === "POST") {
                content = [{ ...route.request().postDataJSON(), interestId: 1001 }];
                return route.fulfill({
                    status: 201,
                    json: {
                        success: true,
                        data: { interestId: 1001 },
                        error: null,
                    },
                });
            }
            return route.fulfill({
                json: {
                    success: true,
                    data: { content, hasNext: false, nextCursor: null },
                    error: null,
                },
            });
        },
    );
    await page.route("**/interests/1001", (route) => {
        expect(route.request().method()).toBe("DELETE");
        content = [];
        return route.fulfill({ json: { success: true, data: null, error: null } });
    });
});

test("search cards open product details while favorites stay on search", async ({ page }) => {
    await page.route("**/products/1", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: { ...detailProduct, source: "OUR", platformName: null, externalUrl: null },
                error: null,
            },
        }),
    );
    await page.route("**/products?*", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: {
                    content: ["OUR", "EXTERNAL"].map((source) => ({
                        source,
                        id: 1,
                        title: source === "OUR" ? "내부 상품" : "외부 상품",
                        price: 150000,
                        status: "ON_SALE",
                        condition: null,
                        defectStatus: null,
                        thumbnailUrl: null,
                        platformName: "번개장터",
                        marketAveragePrice: null,
                        categoryName: "전자기기",
                        createdAt: "2026-10-01T10:00:00",
                    })),
                    hasNext: false,
                    nextCursor: null,
                },
                error: null,
            },
        }),
    );
    await page.goto("/search");
    const favorite = page.getByRole("button", { name: "내부 상품 관심 상품", exact: true });
    await favorite.click();
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/\/search$/);
    await expect(
        page.getByRole("link", { name: "외부 상품 상세보기", exact: true }),
    ).toHaveAttribute("href", "/search/1");
    await page.getByRole("link", { name: "내부 상품 상세보기", exact: true }).click();
    await expect(page).toHaveURL(/\/search\/1$/);
    await expect(
        page.getByRole("heading", { name: "아이폰 13 미니 128GB 미드나이트", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "← 이전 페이지", exact: true }).click();
    await expect(page).toHaveURL(/\/search$/);
});

test("detail gallery and favorite use product and interest APIs", async ({ page }) => {
    let productRequests = 0;
    page.on("request", (request) => {
        if (new URL(request.url()).pathname.startsWith("/products")) productRequests += 1;
    });
    await page.goto("/search/1");
    await expect(
        page.getByRole("img", { name: `${detailProduct.title} 이미지 1`, exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole("group", { name: "상품 이미지 선택" }).getByRole("button"),
    ).toHaveCount(detailProduct.imageUrls.length - 1);
    await expect(page.getByRole("button", { name: "상품 이미지 1", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "상품 이미지 2", exact: true }).click();
    await expect(page.getByRole("button", { name: "상품 이미지 2", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    await expect(
        page.getByRole("img", { name: `${detailProduct.title} 이미지 2`, exact: true }),
    ).toBeVisible();
    const favorite = page.getByRole("button", { name: "관심상품에 추가", exact: true });
    await favorite.click();
    await expect(
        page.getByRole("button", { name: "관심상품에 추가됨", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const likedButton = page.getByRole("button", { name: "관심상품에 추가됨", exact: true });
    await expect(likedButton.locator("svg")).toHaveCSS("color", "rgb(250, 80, 61)");
    await expect(likedButton.locator("svg")).toHaveCSS("fill", "rgb(250, 80, 61)");
    await likedButton.click();
    await expect(
        page.getByRole("button", { name: "관심상품에 추가", exact: true }).locator("svg"),
    ).toHaveAttribute("fill", "none");
    await expect(page.getByRole("link", { name: "판매글 바로가기", exact: true })).toHaveAttribute(
        "href",
        detailProduct.externalUrl!,
    );
    await expect(page.getByRole("button", { name: "AI 분석 보기", exact: true })).toBeEnabled();
    expect(productRequests).toBe(1);
});

test("detail matches the design layout and fits desktop and mobile", async ({ page }, testInfo) => {
    await page.goto("/search/1");
    for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect(page.locator("main")).toContainText("345,000원");
        await expect(page.locator("main")).toContainText("↓ 평균보다 5% 낮아요");
        expect(
            await page
                .locator("main")
                .evaluate((element) => element.scrollWidth <= element.clientWidth),
        ).toBe(true);
        const placeholder = page.getByRole("img", {
            name: `${detailProduct.title} 이미지 1`,
            exact: true,
        });
        if (width === 1440) {
            const box = await placeholder.locator("..").boundingBox();
            expect(box?.width).toBe(588);
            expect(box?.height).toBe(380);
        }
        const infoIcon = page.locator("main .lucide-info");
        const externalIcon = page.locator("main .lucide-external-link");
        expect((await infoIcon.boundingBox())?.width).toBe(15);
        expect((await externalIcon.boundingBox())?.width).toBe(24);
        expect(
            (await page.getByRole("button", { name: "AI 분석 보기", exact: true }).boundingBox())
                ?.height,
        ).toBe(45);
        await expect(
            page.getByText("AI가 시세 분석과 거래 타이밍을 종합해 알려드려요."),
        ).toBeVisible();
        await page
            .locator("main")
            .screenshot({ path: testInfo.outputPath(`search-detail-${width}.png`) });
    }
});
