import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            status: 200,
            json: { success: true, data: { accessToken: "my-ui-preview" }, error: null },
        }),
    );
});

test("my pages share navigation and fit a mobile content area", async ({ page }) => {
    const routes = [
        ["/my", "안녕하세요, 민준님 👋"],
        ["/my/settings", "사용자 정보 설정"],
        ["/my/password", "비밀번호 변경"],
        ["/my/notifications", "알림 설정"],
        ["/my/products", "등록된 상품 확인"],
        ["/my/platforms", "플랫폼 별 연동 확인"],
        ["/my/withdraw", "회원 탈퇴"],
    ];
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [path, title] of routes) {
        await page.goto(path);
        await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
        const main = page.locator("main");
        expect(await main.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
            true,
        );
        await expect(
            page
                .getByRole("navigation", { name: "마이페이지 메뉴" })
                .getByRole("link", { name: "비밀번호 변경" }),
        ).toHaveAttribute("href", "/my/password");
        await expect(
            page
                .getByRole("navigation", { name: "마이페이지 메뉴" })
                .getByRole("button", { name: "로그아웃", exact: true }),
        ).toBeVisible();
    }
});

test("home greets the member returned by the API", async ({ page }) => {
    await page.route("**/users/me", (route) =>
        route.fulfill({
            status: 200,
            json: {
                success: true,
                data: {
                    memberId: 2,
                    name: "이서연",
                    nickname: "다른 닉네임",
                    email: null,
                    phone: null,
                    profileImageUrl: null,
                },
                error: null,
            },
        }),
    );
    await page.goto("/my");
    await expect(
        page.getByRole("heading", { name: "안녕하세요, 다른 닉네임님 👋", exact: true }),
    ).toBeVisible();
    await expect(page.locator("aside").getByText("다른 닉네임", { exact: true })).toBeVisible();
});

test("profile accepts local edits and previews a photo", async ({ page }) => {
    await page.goto("/my/settings");
    await page.getByLabel("이름 (닉네임)").fill("새 닉네임");
    await expect(page.getByLabel("이메일", { exact: true })).toHaveAttribute("readonly", "");
    await page.getByLabel("프로필 사진 선택").setInputFiles({
        name: "avatar.png",
        mimeType: "image/png",
        buffer: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=",
            "base64",
        ),
    });
    await expect(page.getByAltText("프로필 사진 미리보기")).toBeVisible();
    await page.getByRole("button", { name: "변경 사항 저장" }).click();
    await expect(page.getByRole("status")).toHaveText("변경 사항이 적용되었습니다.");
});

test("notification switches respond to keyboard input", async ({ page }) => {
    await page.goto("/my/notifications");
    const toggle = page.getByRole("switch", { name: "AI 추천 타이밍 알림", exact: true });
    await expect(toggle).toBeChecked();
    await toggle.focus();
    await page.keyboard.press("Space");
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await expect(toggle).toBeChecked();
});

test("product filters show matching rows", async ({ page }) => {
    await page.goto("/my/products");
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(6);
    await page.getByRole("button", { name: "판매 상품 3", exact: true }).click();
    await expect(rows).toHaveCount(3);
    await page.getByRole("button", { name: "관심 상품 2", exact: true }).click();
    await expect(rows).toHaveCount(2);
    await page.getByRole("button", { name: "전체 6", exact: true }).click();
    await expect(rows).toHaveCount(6);
});

test("platform connection preview supports confirm and cancel", async ({ page }) => {
    await page.goto("/my/platforms");
    await page.getByRole("button", { name: "번개장터 연결하기", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: "취소", exact: true }).click();
    await expect(
        page.getByRole("button", { name: "번개장터 연결하기", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "번개장터 연결하기", exact: true }).click();
    await dialog.getByRole("button", { name: "연결하기", exact: true }).click();
    await expect(
        page.getByRole("button", { name: "번개장터 연결 해제", exact: true }),
    ).toBeVisible();
});

test("withdrawal requires consent and cancellation sends no request", async ({ page }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
        if (
            ["POST", "PUT", "PATCH", "DELETE"].includes(request.method()) &&
            !request.url().includes("/auth/refresh")
        )
            writes.push(request.url());
    });
    await page.goto("/my/withdraw");
    const next = page.getByRole("button", { name: "다음 단계", exact: true });
    await expect(next).toBeDisabled();
    await page.getByRole("checkbox").check();
    await next.click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("alertdialog").getByRole("button", { name: "취소", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    expect(writes).toEqual([]);
});

test("withdrawal disables repeat submissions and redirects after success", async ({ page }) => {
    let finishRequest!: () => void;
    const responseReady = new Promise<void>((resolve) => {
        finishRequest = resolve;
    });
    let requests = 0;
    await page.route("**/users/me", async (route) => {
        if (route.request().method() !== "DELETE") return route.fallback();
        requests++;
        expect(route.request().headers().authorization).toBe("Bearer my-ui-preview");
        await responseReady;
        await route.fulfill({
            status: 200,
            json: { success: true, message: "탈퇴 완료", data: null, error: null },
        });
    });
    await page.goto("/my/withdraw");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "다음 단계", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: "탈퇴하기", exact: true }).click();
    await expect(
        dialog.getByRole("button", { name: "탈퇴 처리 중...", exact: true }),
    ).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "취소", exact: true })).toBeDisabled();
    finishRequest();
    await expect(page).toHaveURL(/\/login$/);
    await expect(
        page.getByRole("banner").getByRole("button", { name: "로그인", exact: true }),
    ).toBeVisible();
    expect(requests).toBe(1);
});

test("withdrawal failure keeps the dialog and authenticated session", async ({ page }) => {
    await page.route("**/users/me", (route) => {
        if (route.request().method() !== "DELETE") return route.fallback();
        return route.fulfill({
            status: 200,
            json: {
                success: false,
                message: "탈퇴 요청을 처리하지 못했습니다.",
                data: null,
                error: null,
            },
        });
    });
    await page.goto("/my/withdraw");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "다음 단계", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: "탈퇴하기", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText("탈퇴 요청을 처리하지 못했습니다.");
    await expect(dialog.getByRole("button", { name: "탈퇴하기", exact: true })).toBeEnabled();
    await dialog.getByRole("button", { name: "취소", exact: true }).click();
    await expect(page).toHaveURL(/\/my\/withdraw$/);
    await expect(
        page.getByRole("banner").getByRole("link", { name: "프로필", exact: true }),
    ).toBeVisible();
});
