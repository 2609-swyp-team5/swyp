import { test as base, expect } from "@playwright/test";
import { emptyHomeSummary } from "./home-summary-fixture";

// 인증 복원을 실제 백엔드에 의존하지 않도록 기본 상태를 비회원으로 설정합니다.
export const test = base.extend({
    context: async ({ context }, runTest) => {
        await context.route("**/home/summary", (route) =>
            route.fulfill({ json: { success: true, data: emptyHomeSummary, error: null } }),
        );
        await context.route(
            (url) => url.pathname === "/interests",
            (route) =>
                route.request().method() === "GET"
                    ? route.fulfill({
                          json: {
                              success: true,
                              data: {
                                  content: [],
                                  nextCursor: null,
                                  hasNext: false,
                                  totalCount: 0,
                                  statusCounts: { BUY: 0, WAIT: 0, SOLD_OUT: 0, PENDING: 0 },
                              },
                              error: null,
                          },
                      })
                    : route.fallback(),
        );
        await context.route(
            (url) => url.pathname === "/platforms",
            (route) =>
                route.fulfill({
                    json: {
                        success: true,
                        data: [
                            {
                                platform: "BUNJANG",
                                platformName: "번개장터",
                                status: "DISCONNECTED",
                                updatedAt: null,
                            },
                        ],
                        error: null,
                    },
                }),
        );
        // 로그인 상태에서 알림 토스트가 목록을 조회한다. 막지 않으면 로컬에 띄운 백엔드가 401을 돌려줘 로그아웃되므로 빈 목록으로 응답한다.
        await context.route(
            (url) => url.pathname === "/notifications" && !url.searchParams.has("_rsc"),
            (route) =>
                // 같은 경로의 프론트 페이지(/notifications) 문서·RSC 요청은 그대로 보낸다
                route.request().method() === "GET" &&
                ["fetch", "xhr"].includes(route.request().resourceType())
                    ? route.fulfill({
                          json: {
                              success: true,
                              data: {
                                  content: [],
                                  nextCursor: null,
                                  hasNext: false,
                                  totalCount: 0,
                              },
                              error: null,
                          },
                      })
                    : route.fallback(),
        );
        await context.route("**/products/me?*", (route) =>
            route.fulfill({
                json: {
                    success: true,
                    data: {
                        content: [],
                        nextCursor: null,
                        hasNext: false,
                        totalCount: 0,
                        statusCounts: { DRAFT: 0, ON_SALE: 0, SOLD_OUT: 0 },
                    },
                    error: null,
                },
            }),
        );
        await runTest(context);
    },
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
