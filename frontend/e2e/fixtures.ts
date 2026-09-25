import { test as base, expect } from "@playwright/test";

// 인증 복원을 실제 백엔드에 의존하지 않도록 기본 상태를 비회원으로 설정합니다.
export const test = base.extend({
    page: async ({ page }, runTest) => {
        await page.route("**/users/me", (route) =>
            route.fulfill({
                status: 200,
                json: {
                    success: true,
                    data: {
                        memberId: 1,
                        name: "김민준",
                        nickname: "민준",
                        email: "minjun.kim@example.com",
                        phone: null,
                        profileImageUrl: null,
                    },
                    error: null,
                },
            }),
        );
        await page.route("**/auth/refresh", (route) =>
            route.fulfill({
                status: 401,
                json: { success: false, message: "인증이 필요합니다.", data: null, error: null },
            }),
        );
        await runTest(page);
    },
});

export { expect };
