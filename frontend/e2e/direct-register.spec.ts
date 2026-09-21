import { expect, test } from "./fixtures";

test("direct registration keeps the product information while moving to status and price", async ({
    page,
}) => {
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
    await expect(page.getByRole("combobox", { name: "구매 시기" })).toContainText("6개월 이내");
    await expect(page.getByRole("radio", { name: "하자 없음", exact: true })).toHaveAttribute(
        "aria-checked",
        "true",
    );

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
});
