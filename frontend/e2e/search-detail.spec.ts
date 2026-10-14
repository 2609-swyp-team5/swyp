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
    let saved = false;
    await page.route("**/interests", (route) => {
        if (route.request().method() === "POST") {
            saved = true;
            return route.fulfill({
                status: 201,
                json: { success: true, data: { interestId: 1001 }, error: null },
            });
        }
        if (route.request().method() === "DELETE") {
            saved = false;
            return route.fulfill({ json: { success: true, data: null, error: null } });
        }
        return route.fallback();
    });
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
                        favorite: source === "OUR" && saved,
                        interestId: source === "OUR" && saved ? 1001 : null,
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
    // 등록하면 관심상품 등록 팝업이 뜨고 모달 뒤 화면이 가려지므로 먼저 닫는다
    await page
        .getByRole("alertdialog", { name: "관심상품으로 등록했어요!" })
        .getByRole("button", { name: "확인", exact: true })
        .click();
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
    await page.getByRole("link", { name: "이전 페이지", exact: true }).click();
    await expect(page).toHaveURL(/\/search$/);
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
});

test("detail gallery and favorite use product and interest APIs", async ({ page }) => {
    let productRequests = 0;
    page.on("request", (request) => {
        // 회원은 분석 결과를 미리 조회(/products/1/analysis)하므로 상품 상세 요청만 센다
        if (new URL(request.url()).pathname === "/products/1") productRequests += 1;
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
    const favorite = page.getByRole("button", { name: "관심상품 추가", exact: true });
    await favorite.click();
    // 등록에 성공하면 알림 조건 안내 팝업을 띄우고, 확인을 누르면 닫힌다
    const addedDialog = page.getByRole("alertdialog", { name: "관심상품으로 등록했어요!" });
    await expect(addedDialog).toContainText(
        `가격이 ${detailProduct.price.toLocaleString("ko-KR")}원 이하로 내려갈 때`,
    );
    await addedDialog.getByRole("button", { name: "확인", exact: true }).click();
    await expect(addedDialog).toHaveCount(0);
    await expect(
        page.getByRole("button", { name: "관심상품 추가됨", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const likedButton = page.getByRole("button", { name: "관심상품 추가됨", exact: true });
    await expect(likedButton.locator("svg")).toHaveCSS("color", "rgb(250, 80, 61)");
    await expect(likedButton.locator("svg")).toHaveCSS("fill", "rgb(250, 80, 61)");
    await likedButton.click();
    await expect(
        page.getByRole("button", { name: "관심상품 추가", exact: true }).locator("svg"),
    ).toHaveAttribute("fill", "none");
    // 해제할 때는 팝업을 띄우지 않는다
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    // 판매글 바로가기는 확인 팝업을 거친다: 취소하면 이동하지 않고, 확인 링크는 플랫폼 이름과 원본 주소를 쓴다
    await page.getByRole("button", { name: "판매글 바로가기", exact: true }).click();
    const externalDialog = page.getByRole("alertdialog", { name: "외부 플랫폼으로 이동합니다" });
    await expect(externalDialog).toContainText("마지막 확인:");
    await expect(
        externalDialog.getByRole("link", {
            name: `${detailProduct.platformName}에서 확인 →`,
            exact: true,
        }),
    ).toHaveAttribute("href", detailProduct.externalUrl!);
    await externalDialog.getByRole("button", { name: "취소", exact: true }).click();
    await expect(externalDialog).toHaveCount(0);
    expect(page.url()).toContain("/search/1");
    // 회원은 버튼 없이 관심상품과 같은 AI 시세 분석 영역을 바로 본다
    await expect(page.getByRole("button", { name: "AI 분석 보기", exact: true })).toHaveCount(0);
    expect(productRequests).toBe(1);
});

test("detail shows the interest dialog before the server responds and closes it on failure", async ({
    page,
}) => {
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route(
        (url) => url.pathname === "/interests",
        async (route) => {
            if (route.request().method() !== "POST") return route.fallback();
            await ready;
            return route.fulfill({
                status: 500,
                json: { success: false, message: "등록 실패", data: null, error: null },
            });
        },
    );
    await page.goto("/search/1");
    await page.getByRole("button", { name: "관심상품 추가", exact: true }).click();
    // 응답 전에 하트와 함께 바로 뜬다
    const addedDialog = page.getByRole("alertdialog", { name: "관심상품으로 등록했어요!" });
    await expect(addedDialog).toBeVisible();
    release();
    // 실패하면 팝업을 닫고 하트를 되돌린 뒤 오류를 보여준다
    await expect(addedDialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "관심상품 추가", exact: true })).toHaveAttribute(
        "aria-pressed",
        "false",
    );
    await expect(page.locator("main").getByRole("alert")).toContainText("등록 실패");
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
        await expect(page.getByRole("button", { name: "AI 분석 보기", exact: true })).toHaveCount(
            0,
        );
        await page
            .locator("main")
            .screenshot({ path: testInfo.outputPath(`search-detail-${width}.png`) });
    }
});
