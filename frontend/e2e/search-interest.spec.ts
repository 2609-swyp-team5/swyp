import { expect, test } from "./fixtures";
import { detailProduct } from "./product-detail-fixture";
import { createProductSummaryMock } from "../src/features/product-management/mocks/productManagementMock";

const products = ["OUR", "EXTERNAL"].map((source) => ({
    source,
    id: 42,
    title: `${source} 상품`,
    price: 1000,
    status: "ON_SALE",
    condition: null,
    defectStatus: null,
    thumbnailUrl: null,
    platformName: "번개장터",
    marketAveragePrice: null,
    categoryName: "전자기기",
    createdAt: "2026-10-01T10:00:00",
    favorite: false,
    interestId: null,
}));

test.beforeEach(async ({ page }) => {
    await page.route("**/products/42", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: { ...detailProduct, id: 42 },
                error: null,
            },
        }),
    );
    await page.route("**/products?*", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: { content: products, hasNext: false, nextCursor: null },
                error: null,
            },
        }),
    );
});

test("restores all interest pages, uses source-specific IDs and shares state with detail", async ({
    page,
}) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: { accessToken: "interest-token" },
                error: null,
            },
        }),
    );
    let saved = true;
    let fail = true;
    let posts = 0;
    let deletes = 0;
    let interestListGets = 0;
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route("**/products?*", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: {
                    content: products.map((product) =>
                        product.source === "EXTERNAL"
                            ? { ...product, favorite: saved, interestId: saved ? 1001 : null }
                            : product,
                    ),
                    hasNext: false,
                    nextCursor: null,
                },
                error: null,
            },
        }),
    );
    await page.route("**/products/42", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: {
                    ...detailProduct,
                    id: 42,
                    favorite: saved,
                    interestId: saved ? 1001 : null,
                },
                error: null,
            },
        }),
    );
    await page.route(
        (url) => url.pathname === "/interests",
        async (route) => {
            const request = route.request();
            expect(request.headers().authorization).toBe("Bearer interest-token");
            if (request.method() === "POST") {
                posts++;
                expect(request.postDataJSON()).toEqual({ source: "EXTERNAL", targetId: 42 });
                if (fail)
                    return route.fulfill({
                        status: 500,
                        json: { success: false, message: "등록 실패", data: null, error: null },
                    });
                await ready;
                saved = true;
                return route.fulfill({
                    status: 201,
                    json: {
                        success: true,
                        data: { interestId: 1001 },
                        error: null,
                    },
                });
            }
            interestListGets++;
            return route.fulfill({
                json: {
                    success: true,
                    data: { content: [], hasNext: false, nextCursor: null },
                    error: null,
                },
            });
        },
    );
    await page.route("**/interests/1001", (route) => {
        expect(route.request().method()).toBe("DELETE");
        deletes++;
        if (fail)
            return route.fulfill({
                status: 500,
                json: { success: false, message: "삭제 실패", data: null, error: null },
            });
        saved = false;
        return route.fulfill({ json: { success: true, data: null, error: null } });
    });
    await page.goto("/search");
    const external = page.getByRole("button", { name: "EXTERNAL 상품 관심 상품", exact: true });
    const our = page.getByRole("button", { name: "OUR 상품 관심 상품", exact: true });
    await expect(external).toBeEnabled();
    await expect(external).toHaveAttribute("aria-pressed", "true");
    await expect(our).toHaveAttribute("aria-pressed", "false");
    expect(interestListGets).toBe(0);
    await external.click();
    await expect(page.locator("main").getByRole("alert")).toContainText("삭제 실패");
    await expect(external).toHaveAttribute("aria-pressed", "true");
    fail = false;
    await external.click();
    await expect(external).toHaveAttribute("aria-pressed", "false");
    fail = true;
    await external.click();
    await expect(page.locator("main").getByRole("alert")).toContainText("등록 실패");
    await expect(external).toHaveAttribute("aria-pressed", "false");
    // 등록이 실패하면 관심상품 등록 팝업도 닫힌다
    const addedDialog = page.getByRole("alertdialog", { name: "관심상품으로 등록했어요!" });
    await expect(addedDialog).toHaveCount(0);
    fail = false;
    await external.click();
    // 응답 전에 팝업과 하트가 먼저 켜지고(낙관적 업데이트), 요청 중 다시 눌러도 추가 요청은 보내지 않는다
    await addedDialog.getByRole("button", { name: "확인", exact: true }).click();
    await expect(external).toHaveAttribute("aria-pressed", "true");
    await external.click();
    await expect(external).toHaveAttribute("aria-pressed", "true");
    release();
    await expect(external).toHaveAttribute("aria-pressed", "true");
    await expect(external.locator("svg")).toHaveAttribute("fill", "currentColor");
    await page.getByRole("link", { name: "EXTERNAL 상품 상세보기" }).click();
    const detail = page.getByRole("button", { name: "관심상품 추가됨", exact: true });
    await expect(detail).toBeEnabled();
    await expect(detail).toHaveAttribute("aria-pressed", "true");
    await detail.click();
    await expect(page.getByRole("button", { name: "관심상품 추가", exact: true })).toHaveAttribute(
        "aria-pressed",
        "false",
    );
    await page.getByRole("link", { name: "이전 페이지", exact: true }).click();
    await expect(external).toHaveAttribute("aria-pressed", "false");
    await page.reload();
    await expect(external).toBeEnabled();
    await expect(external).toHaveAttribute("aria-pressed", "false");
    expect(posts).toBe(2);
    expect(deletes).toBe(3);
});

test("saved interests survive reload and revisits and appear in the wishlist", async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "interest-token" }, error: null },
        }),
    );
    let saved = false;
    const interest = {
        interestId: 1001,
        source: "EXTERNAL",
        targetId: 42,
        title: "EXTERNAL 상품",
        price: 1000,
        status: "ON_SALE",
        condition: null,
        categoryName: "전자기기",
        thumbnailUrl: null,
        recommendation: "BUY",
        interestStatus: "BUY",
        marketAveragePrice: null,
        platformName: "번개장터",
        externalUrl: null,
        targetPrice: null,
        createdAt: "2026-10-04T10:00:00",
    };
    await page.route(
        (url) => url.pathname === "/interests",
        (route) => {
            if (route.request().method() === "POST") {
                expect(route.request().postDataJSON()).toEqual({
                    source: "EXTERNAL",
                    targetId: 42,
                });
                saved = true;
                return route.fulfill({
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
                    data: {
                        content: saved ? [interest] : [],
                        nextCursor: null,
                        hasNext: false,
                        totalCount: saved ? 1 : 0,
                        statusCounts: { BUY: saved ? 1 : 0, WAIT: 0, SOLD_OUT: 0, PENDING: 0 },
                    },
                    error: null,
                },
            });
        },
    );
    await page.route("**/products?*", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: {
                    content: products.map((product) =>
                        product.source === "EXTERNAL"
                            ? { ...product, favorite: saved, interestId: saved ? 1001 : null }
                            : product,
                    ),
                    hasNext: false,
                    nextCursor: null,
                },
                error: null,
            },
        }),
    );
    await page.route("**/interests/1001", (route) => {
        expect(route.request().method()).toBe("DELETE");
        saved = false;
        return route.fulfill({ json: { success: true, data: null, error: null } });
    });
    await page.goto("/search");
    const favorite = page.getByRole("button", { name: "EXTERNAL 상품 관심 상품", exact: true });
    await expect(favorite).toBeEnabled();
    await expect(favorite).toHaveAttribute("aria-pressed", "false");
    await favorite.click();
    // 등록하면 관심상품 등록 팝업이 뜨고 모달 뒤 화면이 가려지므로 먼저 닫는다
    await page
        .getByRole("alertdialog", { name: "관심상품으로 등록했어요!" })
        .getByRole("button", { name: "확인", exact: true })
        .click();
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(favorite).toBeEnabled();
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
    await page.goto("/buy/wishlist");
    await expect(page.locator("main").getByText("EXTERNAL 상품", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "상품 검색하기", exact: true }).click();
    await expect(favorite).toBeEnabled();
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
    await favorite.click();
    await expect(favorite).toHaveAttribute("aria-pressed", "false");
    await page.reload();
    await expect(favorite).toBeEnabled();
    await expect(favorite).toHaveAttribute("aria-pressed", "false");
    await page.goto("/buy/wishlist");
    await expect(page.locator("main")).toContainText("관심상품이 없습니다.");
});

test("deleting from the wishlist immediately clears the cached search heart", async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "interest-token" }, error: null },
        }),
    );

    let saved = true;
    let searchRequestCount = 0;
    let releaseSearchResponse!: () => void;
    const searchResponseReady = new Promise<void>((resolve) => {
        releaseSearchResponse = resolve;
    });
    const interest = {
        interestId: 1001,
        source: "EXTERNAL",
        targetId: 42,
        title: "EXTERNAL 상품",
        price: 1000,
        status: "ON_SALE",
        condition: null,
        categoryName: "전자기기",
        thumbnailUrl: null,
        recommendation: "BUY",
        interestStatus: "BUY",
        marketAveragePrice: null,
        platformName: "번개장터",
        externalUrl: null,
        targetPrice: null,
        createdAt: "2026-10-04T10:00:00",
    };

    await page.route(
        (url) => url.pathname === "/interests",
        (route) => {
            if (route.request().method() === "DELETE") return route.fallback();
            return route.fulfill({
                json: {
                    success: true,
                    data: {
                        content: saved ? [interest] : [],
                        nextCursor: null,
                        hasNext: false,
                        totalCount: saved ? 1 : 0,
                        statusCounts: { BUY: saved ? 1 : 0, WAIT: 0, SOLD_OUT: 0, PENDING: 0 },
                    },
                    error: null,
                },
            });
        },
    );
    await page.route("**/interests/1001", (route) => {
        expect(route.request().method()).toBe("DELETE");
        saved = false;
        return route.fulfill({ json: { success: true, data: null, error: null } });
    });
    await page.route("**/products/42/summary", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: {
                    ...createProductSummaryMock(42),
                    source: "EXTERNAL",
                    title: interest.title,
                },
                error: null,
            },
        }),
    );
    await page.route("**/products?*", async (route) => {
        searchRequestCount += 1;
        if (searchRequestCount > 1 && !saved) {
            await searchResponseReady;
        }
        return route.fulfill({
            json: {
                success: true,
                data: {
                    content: [{ ...products[1], favorite: saved, interestId: saved ? 1001 : null }],
                    hasNext: false,
                    nextCursor: null,
                },
                error: null,
            },
        });
    });

    await page.goto("/search");
    const favorite = page.getByRole("button", { name: "EXTERNAL 상품 관심 상품", exact: true });
    await expect(favorite).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("link", { name: "관심 상품", exact: true }).click();
    await page.getByText(interest.title, { exact: true }).click();
    const deleteButton = page.getByRole("button", { name: "관심 상품 삭제", exact: true });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();
    await expect(page.getByRole("link", { name: "상품 검색하기", exact: true })).toBeVisible();

    await page.getByRole("link", { name: "상품 검색하기", exact: true }).click();
    // 검색 API 응답을 일부러 보류해도 이전 검색 캐시가 즉시 해제 상태여야 한다.
    await expect(favorite).toHaveAttribute("aria-pressed", "false");
    releaseSearchResponse();
});

test("guests can search but interest buttons require login without API writes", async ({
    page,
}) => {
    let requests = 0;
    page.on("request", (request) => {
        if (new URL(request.url()).pathname.startsWith("/interests")) requests++;
    });
    await page.goto("/search");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await page.getByRole("button", { name: "OUR 상품 관심 상품" }).click();
    const dialog = page.getByRole("alertdialog", { name: "로그인이 필요합니다" });
    await expect(dialog).toContainText("로그인 후 사용해 주세요.");
    await dialog.getByRole("button", { name: "확인", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/search/42");
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "관심상품 추가", exact: true }).click();
    await expect(dialog).toContainText("로그인 후 사용해 주세요.");
    await dialog.getByRole("button", { name: "확인", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(requests).toBe(0);
});

test("search response interest state does not depend on the full interest list", async ({
    page,
}) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: { accessToken: "interest-token" },
                error: null,
            },
        }),
    );
    let interestListGets = 0;
    await page.route(
        (url) => url.pathname === "/interests",
        (route) => {
            interestListGets++;
            return route.fulfill({
                status: 500,
                json: { success: false, message: "관심 목록 조회 실패", data: null, error: null },
            });
        },
    );
    let deleted = false;
    await page.route("**/interests/2000", (route) => {
        expect(route.request().method()).toBe("DELETE");
        deleted = true;
        return route.fulfill({
            json: { success: true, data: null, error: null },
        });
    });
    await page.route(
        (url) => url.pathname === "/products" && url.searchParams.has("size"),
        (route) =>
            route.fulfill({
                json: {
                    success: true,
                    data: {
                        content: [{ ...products[0], favorite: true, interestId: 2000 }],
                        hasNext: false,
                        nextCursor: null,
                        totalCount: 1,
                    },
                    error: null,
                },
            }),
    );
    await page.goto("/search");
    const favorite = page.getByRole("button", { name: "OUR 상품 관심 상품", exact: true });
    await expect(favorite).toBeEnabled();
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
    await favorite.click();
    await expect(favorite).toHaveAttribute("aria-pressed", "false");
    expect(deleted).toBe(true);
    expect(interestListGets).toBe(0);
});

test("uses the search response interest ID when the full interest list is unavailable", async ({
    page,
}) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "interest-token" }, error: null },
        }),
    );
    let deleted = false;
    let posted = false;
    let interestListGets = 0;
    await page.route(
        (url) => url.pathname === "/interests" || url.pathname === "/interests/1001",
        (route) => {
            if (route.request().method() === "DELETE") {
                expect(route.request().url()).toContain("/interests/1001");
                deleted = true;
                return route.fulfill({ json: { success: true, data: null, error: null } });
            }
            if (route.request().method() === "POST") {
                expect(route.request().postDataJSON()).toEqual({
                    source: "EXTERNAL",
                    targetId: 42,
                });
                posted = true;
                return route.fulfill({
                    status: 201,
                    json: { success: true, data: { interestId: 1002 }, error: null },
                });
            }
            interestListGets++;
            return route.fulfill({
                status: 500,
                json: { success: false, message: "관심 목록 조회 실패", data: null, error: null },
            });
        },
    );
    await page.route(
        (url) => url.pathname === "/products" && url.searchParams.has("size"),
        (route) =>
            route.fulfill({
                json: {
                    success: true,
                    data: {
                        content: [
                            {
                                ...products[1],
                                favorite: true,
                                interestId: 1001,
                            },
                        ],
                        hasNext: false,
                        nextCursor: null,
                        totalCount: 1,
                    },
                    error: null,
                },
            }),
    );

    await page.goto("/search");
    const favorite = page.getByRole("button", { name: "EXTERNAL 상품 관심 상품", exact: true });
    await expect(favorite).toBeEnabled();
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
    await favorite.click();
    await expect.poll(() => deleted).toBe(true);
    await expect(favorite).toHaveAttribute("aria-pressed", "false");
    await favorite.click();
    await expect.poll(() => posted).toBe(true);
    // 등록하면 관심상품 등록 팝업이 떠서(모달 뒤 화면은 가려짐) 닫고 확인한다
    await page
        .getByRole("alertdialog", { name: "관심상품으로 등록했어요!" })
        .getByRole("button", { name: "확인", exact: true })
        .click();
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
    expect(interestListGets).toBe(0);
});

test("liking on the search page shows the interest dialog like the detail page", async ({
    page,
}) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "interest-token" }, error: null },
        }),
    );
    await page.route(
        (url) => url.pathname === "/interests",
        (route) =>
            route.request().method() === "POST"
                ? route.fulfill({
                      json: { success: true, data: { interestId: 1001 }, error: null },
                  })
                : route.fulfill({
                      json: {
                          success: true,
                          data: { content: [], nextCursor: null, hasNext: false, totalCount: 0 },
                          error: null,
                      },
                  }),
    );
    await page.route("**/interests/1001", (route) =>
        route.fulfill({ json: { success: true, data: null, error: null } }),
    );
    await page.route(
        (url) => url.pathname === "/products",
        (route) =>
            route.fulfill({
                json: {
                    success: true,
                    data: {
                        content: [{ ...products[1], favorite: false, interestId: null }],
                        nextCursor: null,
                        hasNext: false,
                        totalCount: 1,
                    },
                    error: null,
                },
            }),
    );
    await page.goto("/search");
    const favorite = page.getByRole("button", { name: "EXTERNAL 상품 관심 상품", exact: true });
    await expect(favorite).toBeEnabled();
    await favorite.click();

    const addedDialog = page.getByRole("alertdialog", { name: "관심상품으로 등록했어요!" });
    await expect(addedDialog).toContainText("목표 구매가를 정해 두면");
    await addedDialog.getByRole("button", { name: "확인", exact: true }).click();
    await expect(addedDialog).toHaveCount(0);
    await expect(favorite).toHaveAttribute("aria-pressed", "true");

    // 해제할 때는 팝업을 띄우지 않는다
    await favorite.click();
    await expect(favorite).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
});
