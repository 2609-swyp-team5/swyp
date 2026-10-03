import { expect, test } from "./fixtures";
import { detailProduct } from "./product-detail-fixture";

test("guest detail retries a failed request and shows the returned product without sample data", async ({
    page,
}) => {
    let fail = true;
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
        release = resolve;
    });
    const product = {
        ...detailProduct,
        id: 77,
        source: "OUR",
        title: "API 상품 77",
        price: 10000,
        status: "SOLD_OUT",
        imageUrls: [],
        marketAveragePrice: null,
        platformName: null,
        externalUrl: null,
    };
    await page.route("**/products/77", async (route) => {
        expect(route.request().method()).toBe("GET");
        expect(new URL(route.request().url()).search).toBe("");
        expect(route.request().headers().authorization).toBeUndefined();
        if (fail) {
            await ready;
            return route.fulfill({
                status: 404,
                json: {
                    success: false,
                    message: "상품을 찾을 수 없습니다.",
                    data: null,
                    error: null,
                },
            });
        }
        return route.fulfill({ json: { success: true, data: product, error: null } });
    });
    await page.goto("/search/77");
    await expect(page.locator("main").getByRole("status")).toContainText(
        "상품 정보를 불러오는 중입니다.",
    );
    await expect(page.getByRole("heading", { name: detailProduct.title })).toHaveCount(0);
    release();
    await expect(page.locator("main").getByRole("alert")).toContainText("상품을 찾을 수 없습니다.");
    fail = false;
    await page.getByRole("button", { name: "다시 시도", exact: true }).click();
    await expect(page.getByRole("heading", { name: "API 상품 77" })).toBeVisible();
    await expect(page.locator("main")).toContainText("10,000원");
    await expect(page.locator("main")).toContainText("판매완료");
    await expect(page.locator("main")).toContainText("비교 데이터 부족");
    await expect(page.getByRole("img", { name: "상품 이미지 없음" })).toBeVisible();
    await expect(page.getByRole("group", { name: "상품 이미지 선택" })).toHaveCount(0);
    await expect(page.locator("main")).toContainText("상품 설명입니다.");
    await expect(page.getByRole("link", { name: "판매글 바로가기" })).toHaveCount(0);
});
