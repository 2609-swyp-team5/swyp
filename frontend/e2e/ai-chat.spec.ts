import { expect, test } from "./fixtures";

const message = (messageId: number, role: "USER" | "ASSISTANT", content: string, extra = {}) => ({
    messageId,
    role,
    content,
    intent: role === "USER" ? null : "SELL",
    analysis: null,
    recommendedProducts: [],
    createdAt: new Date().toISOString(),
    ...extra,
});

const analysis = {
    productId: 42,
    source: "OUR",
    mine: true,
    title: "아이폰 16 퍼플",
    price: 1050000,
    recommendation: "SELL",
    reason: "현재 매물은 추세가 뚜렷하게 보이지 않습니다.",
    averagePrice: 936667,
    analysisStatus: "ANALYZED",
};

const products = [1, 2, 3, 4].map((id) => ({
    id,
    source: "EXTERNAL",
    platformName: "번개장터",
    imageUrl: null,
    title: `아이폰 16 매물 ${id}`,
    price: 400000 + id * 10000,
    averagePrice: 936667,
    priceDiffRate: -50,
    externalUrl: null,
}));

const question = "아이폰 16 지금 팔아도 될까?";
const answerText = "아이폰 16은 지금 팔기 좋아요.";

test.beforeEach(async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({ json: { success: true, data: { accessToken: "ai-chat" }, error: null } }),
    );
    let created = false;
    await page.route(
        (url) => url.pathname === "/ai/chats",
        async (route) => {
            if (route.request().method() === "POST") {
                created = true;
                const event = (data: unknown, text = "") =>
                    `data:${JSON.stringify({ success: true, message: text, data })}\n\n`;
                return route.fulfill({
                    status: 200,
                    contentType: "text/event-stream",
                    body:
                        event(
                            {
                                event: "step",
                                step: "INTERPRET",
                                status: "START",
                                index: 1,
                                total: 3,
                            },
                            "질문을 이해하고 있어요.",
                        ) +
                        event({
                            event: "step",
                            step: "SEARCH",
                            status: "DONE",
                            index: 2,
                            total: 3,
                            result: { intent: "SELL", analysis, recommendedProducts: products },
                        }) +
                        event({ event: "delta", text: answerText }) +
                        event({
                            event: "complete",
                            chatId: 3,
                            title: question,
                            question: message(10, "USER", question),
                            answer: message(11, "ASSISTANT", answerText, {
                                analysis,
                                recommendedProducts: products,
                            }),
                        }),
                });
            }
            return route.fulfill({
                json: {
                    success: true,
                    data: {
                        content: created
                            ? [
                                  {
                                      chatId: 3,
                                      title: question,
                                      createdAt: new Date().toISOString(),
                                      updatedAt: new Date().toISOString(),
                                  },
                              ]
                            : [],
                        nextCursor: null,
                        hasNext: false,
                        totalCount: created ? 1 : 0,
                    },
                    error: null,
                },
            });
        },
    );
    await page.route("**/ai/chats/suggestions?*", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: [{ question, intent: "SELL", keyword: "아이폰 16", source: "MY_PRODUCT" }],
                error: null,
            },
        }),
    );
    await page.route("**/ai/chats/3/messages", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: {
                    chatId: 3,
                    title: question,
                    messages: [
                        message(10, "USER", question),
                        message(11, "ASSISTANT", answerText, {
                            analysis,
                            recommendedProducts: products,
                        }),
                    ],
                },
                error: null,
            },
        }),
    );
});

test("asks a suggested question and shows the streamed answer with its cards", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/ai");
    await expect(page.getByRole("heading", { name: "지금이니 AI", level: 1 })).toBeVisible();
    await expect(
        page
            .getByRole("navigation", { name: "주요 메뉴", exact: true })
            .getByRole("link", { name: "지금이니 AI" }),
    ).toHaveAttribute("aria-current", "page");

    await page.getByRole("button", { name: question }).click();

    const answer = page.getByText(answerText, { exact: true });
    await expect(answer).toBeVisible();
    await expect(page.getByText(question, { exact: true }).first()).toBeVisible();
    await expect(page.getByText("아이폰 16 퍼플 — 지금 팔기 좋아요")).toBeVisible();
    await expect(page.getByRole("link", { name: /더보기/ })).toHaveAttribute(
        "href",
        "/sell/manage?selected=42",
    );
    await expect(page.getByRole("button", { name: "다음 추천 상품" })).toBeEnabled();
    await expect(page.getByRole("complementary", { name: "최근 대화 목록" })).toContainText(
        question,
    );
    await expect(page.getByRole("button", { name: "답변 다시 만들기" })).toBeVisible();
});

test("uses the AI tab on phones and opens the chat list from the conversation", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ai");
    const tabBar = page.getByRole("navigation", { name: "하단 메뉴" });
    await expect(tabBar.getByRole("link", { name: "AI" })).toHaveAttribute("aria-current", "page");

    await page.getByRole("textbox", { name: "AI에게 질문하기" }).fill(question);
    await page.getByRole("button", { name: "질문하기" }).click();
    await expect(page.getByText(answerText, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
    );

    await page.getByRole("button", { name: "대화 목록" }).click();
    const list = page.getByRole("complementary", { name: "최근 대화 목록" });
    await expect(list).toBeVisible();
    await list.getByRole("button", { name: question }).first().click();
    await expect(page.getByText(answerText, { exact: true })).toBeVisible();
});
