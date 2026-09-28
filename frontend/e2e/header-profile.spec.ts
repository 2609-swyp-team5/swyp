import { test, expect } from "./fixtures";

function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((release) => {
        resolve = release;
    });
    return { promise, resolve };
}

test("새로고침 시 인증과 사진 복원 동안 로그인과 기본 이미지를 표시하지 않는다", async ({
    page,
}) => {
    await page.goto("/home");
    await expect(page.getByRole("banner").getByRole("button", { name: "로그인" })).toBeVisible();

    const auth = deferred();
    const member = deferred();
    const image = deferred();
    await page.route("**/auth/refresh", async (route) => {
        await auth.promise;
        await route.fulfill({
            json: { success: true, data: { accessToken: "header-test-token" }, error: null },
        });
    });
    await page.route("**/users/me", async (route) => {
        await member.promise;
        await route.fulfill({
            json: {
                success: true,
                data: { memberId: 1, nickname: "민준", profileImageUrl: "/header-avatar.png" },
                error: null,
            },
        });
    });
    await page.route("**/header-avatar.png", async (route) => {
        await image.promise;
        await route.fulfill({
            contentType: "image/png",
            body: Buffer.from(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
                "base64",
            ),
        });
    });
    await page.addInitScript(() => {
        const state = { flashed: false };
        Object.assign(window, { headerProfileTest: state });
        new MutationObserver(() => {
            const header = document.querySelector("header");
            if (
                header?.querySelector("[data-slot=avatar-fallback] span") ||
                Array.from(header?.querySelectorAll("button") ?? []).some(
                    (button) => button.textContent?.trim() === "로그인",
                )
            ) {
                state.flashed = true;
            }
        }).observe(document, { childList: true, subtree: true });
    });

    await page.reload();
    const header = page.getByRole("banner");
    await expect(header.getByRole("status", { name: "로그인 상태 확인 중" })).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    auth.resolve();
    await expect(header.getByRole("status", { name: "로그인 상태 확인 중" })).toBeVisible();
    member.resolve();
    await expect(header.getByRole("status", { name: "프로필 사진 불러오는 중" })).toBeVisible();
    image.resolve();
    await expect(header.getByRole("img", { name: "프로필 사진" })).toBeVisible();
    await expect(header.locator('a[href="/my"]')).toBeVisible();
    expect(await page.evaluate(() => Reflect.get(window, "headerProfileTest").flashed)).toBe(false);
});

test("비회원은 인증 확인이 끝난 뒤 로그인 버튼을 표시한다", async ({ page }) => {
    const auth = deferred();
    await page.route("**/auth/refresh", async (route) => {
        await auth.promise;
        await route.fulfill({ status: 401, json: { success: false, data: null, error: null } });
    });
    await page.goto("/home");
    const header = page.getByRole("banner");
    await expect(header.getByRole("status", { name: "로그인 상태 확인 중" })).toBeVisible();
    await expect(header.getByRole("button", { name: "로그인" })).toHaveCount(0);
    auth.resolve();
    await expect(header.getByRole("button", { name: "로그인" })).toBeVisible();
    await expect(header.getByRole("status")).toHaveCount(0);
});

test("프로필 사진 로딩에 실패하면 기본 이미지를 표시한다", async ({ page }) => {
    const image = deferred();
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({ json: { success: true, data: { accessToken: "header-test-token" } } }),
    );
    await page.route("**/users/me", (route) =>
        route.fulfill({
            json: { success: true, data: { memberId: 1, profileImageUrl: "/broken-avatar.png" } },
        }),
    );
    await page.route("**/broken-avatar.png", async (route) => {
        await image.promise;
        await route.abort();
    });
    await page.goto("/home");
    const header = page.getByRole("banner");
    await expect(header.getByRole("status", { name: "프로필 사진 불러오는 중" })).toBeVisible();
    image.resolve();
    await expect(header.locator("[data-slot=avatar-fallback] span")).toBeVisible();
    await expect(header.getByRole("status")).toHaveCount(0);
});
