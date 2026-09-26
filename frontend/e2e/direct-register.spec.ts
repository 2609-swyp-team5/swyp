import { expect, test } from "./fixtures";

test("direct registration keeps the product information while moving to status and price", async ({
    page,
}) => {
    await page.route("**/products", (route) => {
        if (route.request().method() !== "POST") {
            return route.continue();
        }

        return route.fulfill({
            status: 201,
            json: {
                success: true,
                message: "상품 등록 성공",
                data: { id: 42 },
                error: null,
            },
        });
    });

    await page.route("**/products/42", (route) =>
        route.fulfill({
            status: 200,
            json: {
                success: true,
                message: "상품 조회 성공",
                data: {
                    id: 42,
                    memberId: 1,
                    nickname: "판매자",
                    category: { id: 2, name: "스마트폰", parentId: 1 },
                    title: "필름카메라 FM2 니콘",
                    brand: null,
                    description: "사용감이 적고 정상적으로 작동하는 상품입니다.",
                    price: 1234567,
                    status: "ON_SALE",
                    condition: "B",
                    defectStatus: "NORMAL",
                    purchasedAt: null,
                    purchasedMonths: null,
                    includedItems: ["body", "charging-cable", "케이스", "설명서", "스트랩"],
                    allowPriceSuggestion: true,
                    tradeMethod: "DIRECT",
                    deliveryType: null,
                    preferredTradeRegion: null,
                    imageUrls: ["https://example.com/product.png"],
                    tags: [],
                    recommendation: null,
                    suggestedPrice: null,
                    analysisDescription: null,
                    createdAt: "2026-09-27T00:00:00",
                    updatedAt: "2026-09-27T00:00:00",
                },
                error: null,
            },
        }),
    );

    await page.route("**/categories", (route) =>
        route.fulfill({
            status: 200,
            json: {
                success: true,
                message: "카테고리 조회 성공",
                data: [
                    { id: 1, name: "전자기기", parentId: null },
                    { id: 2, name: "스마트폰", parentId: 1 },
                ],
                error: null,
            },
        }),
    );

    await page.goto("/sell/register/direct");
    await page.locator('input[type="file"]').setInputFiles({
        name: "product.png",
        mimeType: "image/png",
        buffer: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLZJwAAAABJRU5ErkJggg==",
            "base64",
        ),
    });
    await expect(page.getByRole("img", { name: "선택한 상품 사진 1" })).toBeVisible();
    await page.getByLabel("상품명", { exact: false }).fill("필름카메라 FM2 니콘");
    await page.getByRole("combobox", { name: "대분류" }).click();
    await page.getByRole("option", { name: "전자기기" }).click();
    await page.getByRole("combobox", { name: "중분류" }).click();
    await page.getByRole("option", { name: "스마트폰" }).click();
    await page
        .getByLabel("상품 설명", { exact: false })
        .fill("사용감이 적고 정상적으로 작동하는 상품입니다.");

    await page.getByRole("button", { name: "다음단계", exact: true }).click();

    await expect(page.getByRole("radio", { name: /사용감 적음/ })).toHaveAttribute(
        "aria-checked",
        "true",
    );
    await expect(page.getByRole("combobox", { name: "구매 시기" })).toContainText("6개월");
    await page.getByRole("combobox", { name: "구매 시기" }).click();
    await expect(page.getByRole("option", { name: "1개월" })).toBeVisible();
    await expect(page.getByRole("option", { name: "6개월" })).toBeVisible();
    await expect(page.getByRole("option", { name: "0개월" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("radio", { name: "하자 없음", exact: true })).toHaveAttribute(
        "aria-checked",
        "true",
    );

    const includedItemInput = page.getByRole("textbox", { name: "구성품 추가" });
    await includedItemInput.fill("케이스");
    await includedItemInput.press("Enter");
    await expect(page.getByRole("button", { name: "케이스 구성품 삭제" })).toBeVisible();

    for (const item of ["보호 필름", "설명서", "스트랩"]) {
        await includedItemInput.fill(item);
        await includedItemInput.press("Enter");
    }

    const moreItemsButton = page.getByRole("button", { name: "숨겨진 구성품 3개 보기" });
    await expect(moreItemsButton).toBeVisible();
    await moreItemsButton.click();
    await expect(page.getByRole("button", { name: "보호 필름 구성품 삭제" })).toBeVisible();
    await page.getByRole("button", { name: "보호 필름 구성품 삭제" }).click();
    await expect(page.getByRole("button", { name: "숨겨진 구성품 2개 보기" })).toBeVisible();

    const priceInput = page.getByRole("textbox", { name: "희망 가격" });
    await priceInput.fill("1234567");
    await expect(priceInput).toHaveValue("1,234,567");

    const priceProposalCheckbox = page.getByRole("checkbox", { name: "가격 제안 허용" });
    await expect(priceProposalCheckbox).not.toBeChecked();
    await priceProposalCheckbox.check();
    await expect(priceProposalCheckbox).toBeChecked();

    await page.getByRole("button", { name: "이전 페이지", exact: true }).click();
    await expect(page.getByLabel("상품명", { exact: false })).toHaveValue("필름카메라 FM2 니콘");
    await expect(page.getByLabel("상품 설명", { exact: false })).toHaveValue(
        "사용감이 적고 정상적으로 작동하는 상품입니다.",
    );

    await page.getByRole("button", { name: "다음단계", exact: true }).click();
    await page.getByRole("button", { name: "AI 분석 & 등록확인" }).click();

    await expect(page.getByRole("heading", { name: "상품을 등록했어요" })).toBeVisible();
    await page.getByRole("button", { name: "확인하러 가기" }).click();

    await expect(page).toHaveURL(/\/sell\/manage\/42\?method=direct/);
    await expect(page.getByRole("heading", { name: "판매글 확인" })).toBeVisible();
});
