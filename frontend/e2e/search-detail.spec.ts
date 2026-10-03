import { expect, test } from "./fixtures";

test("search cards open source-specific details while favorites stay on search", async ({
    page,
}) => {
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
    ).toHaveAttribute("href", "/search/EXTERNAL/1");
    await page.getByRole("link", { name: "내부 상품 상세보기", exact: true }).click();
    await expect(page).toHaveURL(/\/search\/OUR\/1$/);
    await expect(
        page.getByRole("heading", { name: "아이폰 13 미니 128GB 미드나이트", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "← 이전 페이지", exact: true }).click();
    await expect(page).toHaveURL(/\/search$/);
});

test("detail gallery and favorite work locally without product API calls", async ({ page }) => {
    let productRequests = 0;
    page.on("request", (request) => {
        if (new URL(request.url()).pathname.startsWith("/products")) productRequests += 1;
    });
    await page.goto("/search/EXTERNAL/1");
    await page.getByRole("button", { name: "상품 이미지 2", exact: true }).click();
    await expect(page.getByRole("button", { name: "상품 이미지 2", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    await expect(page.getByRole("img", { name: "상품 이미지 2 자리", exact: true })).toBeVisible();
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
    await expect(page.getByRole("button", { name: "판매글 바로가기", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "AI 분석 보기", exact: true })).toBeDisabled();
    expect(productRequests).toBe(0);
});

test("detail matches the design layout and fits desktop and mobile", async ({ page }, testInfo) => {
    await page.goto("/search/EXTERNAL/1");
    for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect(page.locator("main")).toContainText("345,000원");
        await expect(page.locator("main")).toContainText("↓ 평균보다 5% 낮아요");
        expect(
            await page
                .locator("main")
                .evaluate((element) => element.scrollWidth <= element.clientWidth),
        ).toBe(true);
        const placeholder = page.getByRole("img", { name: "상품 이미지 1 자리", exact: true });
        await expect(placeholder).toHaveCSS("background-color", "rgb(211, 211, 211)");
        if (width === 1440) {
            const box = await placeholder.boundingBox();
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
        ).toBe(44);
        await page
            .locator("main")
            .screenshot({ path: testInfo.outputPath(`search-detail-${width}.png`) });
    }
});
