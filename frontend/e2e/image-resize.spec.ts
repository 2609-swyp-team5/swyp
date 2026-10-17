import { expect, test } from "./fixtures";

// 휴대폰 원본처럼 큰 사진을 올려도 업로드 전에 줄여서 보낸다(서버 업로드 한도 10MB·AI 분석 요청 크기 안에 들도록)
test("direct registration shrinks a large photo before uploading", async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            json: { success: true, data: { accessToken: "resize-token" }, error: null },
        }),
    );
    await page.route("**/categories", (route) =>
        route.fulfill({
            json: {
                success: true,
                data: [
                    { id: 1, name: "전자기기", parentId: null, leaf: false },
                    { id: 2, name: "카메라", parentId: 1, leaf: false },
                    { id: 3, name: "필름카메라", parentId: 2, leaf: true },
                ],
                error: null,
            },
        }),
    );

    let uploadedBytes = 0;
    let uploadedBody = "";
    await page.route(/\/products(\?.*)?$/, async (route) => {
        if (route.request().method() !== "POST") {
            return route.continue();
        }
        const body = route.request().postDataBuffer() ?? Buffer.alloc(0);
        uploadedBytes = body.length;
        uploadedBody = body.toString("latin1");
        return route.fulfill({
            status: 200,
            contentType: "text/event-stream",
            body: `data:${JSON.stringify({
                success: false,
                message: "확인용 응답",
                data: { event: "error", step: "IMAGE_UPLOAD" },
                error: { code: "IMAGE_UPLOAD_FAILED" },
            })}\n\n`,
        });
    });

    await page.goto("/sell/register/direct");

    // 4000×3000 PNG(잡음이 섞여 압축이 잘 안 되는 큰 사진)를 브라우저에서 만든다
    const pngBase64 = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 4000;
        canvas.height = 3000;
        const context = canvas.getContext("2d")!;
        const image = context.createImageData(4000, 3000);
        for (let index = 0; index < image.data.length; index += 4) {
            const pixel = index / 4;
            image.data[index] = (pixel % 4000) % 256;
            image.data[index + 1] = Math.floor(pixel / 4000) % 256;
            image.data[index + 2] = Math.floor(Math.random() * 64);
            image.data[index + 3] = 255;
        }
        context.putImageData(image, 0, 0);
        return canvas.toDataURL("image/png").split(",")[1];
    });
    const original = Buffer.from(pngBase64, "base64");
    expect(original.length).toBeGreaterThan(5 * 1024 * 1024);
    expect(original.length).toBeLessThan(20 * 1024 * 1024);

    await page.locator('input[type="file"]').setInputFiles({
        name: "IMG_4000.png",
        mimeType: "image/png",
        buffer: original,
    });
    await page.getByLabel("상품명", { exact: false }).fill("필름카메라 FM2 니콘");
    await page.getByRole("combobox", { name: "대분류" }).click();
    await page.getByRole("option", { name: "전자기기" }).click();
    await page.getByRole("combobox", { name: "중분류" }).click();
    await page.getByRole("option", { name: "카메라" }).click();
    await page.getByRole("combobox", { name: "소분류" }).click();
    await page.getByRole("option", { name: "필름카메라" }).click();
    await page
        .getByLabel("상품 설명", { exact: false })
        .fill("사용감이 적고 정상적으로 작동하는 상품입니다.");
    await page.getByRole("button", { name: "다음단계", exact: true }).click();
    await page.getByRole("textbox", { name: "희망 가격" }).fill("300000");
    await page.getByRole("radio", { name: "택배 거래" }).click();
    await page.getByRole("radio", { name: "배송비 포함" }).click();
    await page.getByRole("button", { name: "AI 분석 & 등록확인" }).click();

    await expect.poll(() => uploadedBytes).toBeGreaterThan(0);
    // 줄인 JPEG로 바뀌어 원본보다 훨씬 작고, 서버 한도(10MB) 안에 든다
    expect(uploadedBody).toContain('filename="IMG_4000.jpg"');
    expect(uploadedBody).toContain("Content-Type: image/jpeg");
    expect(uploadedBytes).toBeLessThan(original.length / 3);
    expect(uploadedBytes).toBeLessThan(2 * 1024 * 1024);
});
