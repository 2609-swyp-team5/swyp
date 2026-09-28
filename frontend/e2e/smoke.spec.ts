import { expect, test } from "./fixtures";

test("onboarding connects to the authentication flow", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("지금이니?");
    await expect(page.getByRole("heading", { name: "지금 팔까, 더 갖고 있을까?" })).toBeVisible();

    await page.getByRole("link", { name: "시작하기", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible();

    await page.getByRole("link", { name: "비회원으로 둘러보기" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("banner").getByRole("link", { name: "홈" })).toHaveAttribute(
        "aria-current",
        "page",
    );

    await expect(page.getByRole("link", { name: "프로필", exact: true })).toHaveCount(0);
    await page.goto("/my");
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/login");
    await page.getByRole("link", { name: "회원가입" }).last().click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole("heading", { name: "회원가입" })).toBeVisible();

    await page.goto("/login");
    await page.getByRole("button", { name: "비밀번호 찾기", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "비밀번호 찾기" })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
});

test("authenticated members can navigate the profile menu", async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            status: 200,
            json: { success: true, data: { accessToken: "test-access-token" }, error: null },
        }),
    );
    await page.goto("/home");
    await page.getByRole("link", { name: "프로필", exact: true }).click();
    await expect(page).toHaveURL(/\/my$/);
    await expect(page.getByRole("link", { name: "프로필", exact: true })).toHaveAttribute(
        "aria-current",
        "page",
    );
    await expect(
        page
            .getByRole("navigation", { name: "마이페이지 메뉴" })
            .getByRole("link", { name: "홈", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await page.getByRole("link", { name: "등록된 상품" }).click();
    await expect(page).toHaveURL(/\/my\/products$/);
    await expect(page.getByRole("link", { name: "등록된 상품" })).toHaveAttribute(
        "aria-current",
        "page",
    );
});

test("home displays its page description", async ({ page }) => {
    await page.goto("/home");

    await expect(page.getByRole("heading", { name: "서비스 홈" })).toBeVisible();
    await expect(page.getByText("서비스 홈 화면입니다.")).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "홈" })).toHaveAttribute(
        "aria-current",
        "page",
    );
});
