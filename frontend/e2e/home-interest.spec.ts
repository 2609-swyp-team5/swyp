import { expect, test } from "./fixtures";
import { popularProducts } from "./home-product-fixture";

test.beforeEach(async ({ page }) => {
    await page.route("**/products/popular", (route) =>
        route.fulfill({ json: { success: true, data: [popularProducts[0]], error: null } }),
    );
});

test("home popular favorites persist across reloads and can be removed", async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "home-interest-token" }, error: null },
        }),
    );
    let saved = false;
    await page.route(
        (url) => url.pathname === "/interests",
        (route) => {
            expect(route.request().headers().authorization).toBe("Bearer home-interest-token");
            if (route.request().method() === "POST") {
                expect(route.request().postDataJSON()).toEqual({
                    source: "OUR",
                    targetId: popularProducts[0].id,
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
                        content: saved
                            ? [{ interestId: 1001, source: "OUR", targetId: popularProducts[0].id }]
                            : [],
                        hasNext: false,
                        nextCursor: null,
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
    await page.goto("/home");
    const favorite = page.getByRole("button", {
        name: "인기 상품 모음 인기 상품 1 관심 상품",
        exact: true,
    });
    await expect(favorite).toBeEnabled();
    await expect(favorite).toHaveAttribute("aria-pressed", "false");
    await favorite.click();
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(favorite).toBeEnabled();
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
    await favorite.click();
    await expect(favorite).toHaveAttribute("aria-pressed", "false");
});

test("guest home favorite opens the login dialog without interest requests", async ({ page }) => {
    let requests = 0;
    page.on("request", (request) => {
        if (new URL(request.url()).pathname.startsWith("/interests")) requests++;
    });
    await page.goto("/home");
    await page
        .getByRole("button", { name: "인기 상품 모음 인기 상품 1 관심 상품", exact: true })
        .click();
    await expect(page.getByRole("alertdialog")).toContainText("로그인 후 사용해 주세요.");
    expect(requests).toBe(0);
});
