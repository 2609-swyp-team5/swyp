import { expect, test } from "./fixtures";

const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=";
const photoUrl = `data:image/png;base64,${png}`;
const file = { name: "avatar.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") };
const member = {
    memberId: 1,
    name: "김민준",
    nickname: "민준",
    email: null,
    phone: null,
    profileImageUrl: photoUrl,
};

test.beforeEach(async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
        route.fulfill({
            status: 200,
            json: { success: true, data: { accessToken: "image-token" }, error: null },
        }),
    );
});

test("uploads selected image only on save and updates avatars", async ({ page }) => {
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
        release = resolve;
    });
    let uploads = 0;
    const updated = { ...member, nickname: "수정 중인 닉네임" };
    await page.route("**/users/me", (route) => {
        if (route.request().method() !== "PATCH") return route.fallback();
        expect(route.request().postDataJSON()).toEqual({ nickname: updated.nickname, phone: null });
        return route.fulfill({
            status: 200,
            json: { success: true, data: { ...updated, profileImageUrl: null }, error: null },
        });
    });
    await page.route("**/users/profile/image", async (route) => {
        uploads++;
        expect(route.request().method()).toBe("POST");
        expect(route.request().headers().authorization).toBe("Bearer image-token");
        expect(route.request().headers()["content-type"]).toContain(
            "multipart/form-data; boundary=",
        );
        expect(route.request().postDataBuffer()?.toString()).toContain(
            'name="image"; filename="avatar.png"',
        );
        await ready;
        await route.fulfill({ status: 200, json: { success: true, data: updated, error: null } });
    });
    await page.goto("/my/settings");
    await expect(page.getByLabel("이름 (닉네임)")).toHaveValue("민준");
    await expect(page.getByRole("banner").locator('[data-slot="avatar-fallback"]')).toBeVisible();
    await expect(page.locator("aside [data-slot='avatar-fallback']")).toBeVisible();
    await expect(page.locator("main [data-slot='avatar-fallback']")).toBeVisible();
    await expect(page.getByRole("banner").locator('[data-slot="avatar"]')).toHaveCSS(
        "width",
        "36px",
    );
    await expect(page.locator("aside [data-slot='avatar']")).toHaveCSS("width", "96px");
    await expect(page.locator("main [data-slot='avatar']")).toHaveCSS("width", "88px");
    await page.getByLabel("이름 (닉네임)").fill("수정 중인 닉네임");
    await page.getByLabel("프로필 사진 선택").setInputFiles(file);
    await expect(page.getByAltText("프로필 사진 미리보기")).toBeVisible();
    expect(uploads).toBe(0);
    await expect(page.locator("aside").getByAltText("프로필 사진")).toHaveCount(0);
    await page.getByRole("button", { name: "변경 사항 저장" }).click();
    await expect(page.getByRole("button", { name: "업로드 중..." })).toBeDisabled();
    await expect(page.getByRole("button", { name: "저장 중..." })).toBeDisabled();
    release();
    await expect(page.getByRole("alertdialog")).toContainText("변경 사항이 적용되었습니다.");
    await page.getByRole("alertdialog").getByRole("button", { name: "확인", exact: true }).click();
    await expect(page.locator("main").getByAltText("프로필 사진", { exact: true })).toHaveAttribute(
        "src",
        photoUrl,
    );
    await expect(page.locator("aside").getByAltText("프로필 사진", { exact: true })).toBeVisible();
    await expect(page.getByRole("banner").getByAltText("프로필 사진")).toHaveAttribute(
        "src",
        photoUrl,
    );
    await expect(page.getByLabel("이름 (닉네임)")).toHaveValue("수정 중인 닉네임");
});

test("rejects invalid files and keeps the previous photo on upload failure", async ({ page }) => {
    await page.route("**/users/me", (route) =>
        route.fulfill({ status: 200, json: { success: true, data: member, error: null } }),
    );
    let requests = 0;
    await page.route("**/users/profile/image", (route) => {
        requests++;
        return route.fulfill({
            status: 200,
            json: { success: false, message: "이미지 저장 실패", data: null, error: null },
        });
    });
    await page.goto("/my/settings");
    const picker = page.getByLabel("프로필 사진 선택");
    await expect(picker).toBeEnabled();
    await picker.setInputFiles({
        name: "file.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("invalid"),
    });
    await expect(page.getByRole("alertdialog")).toContainText("5MB 이하의 JPG 또는 PNG");
    await page.getByRole("alertdialog").getByRole("button", { name: "확인", exact: true }).click();
    expect(requests).toBe(0);
    await picker.setInputFiles({
        name: "large.png",
        mimeType: "image/png",
        buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    });
    await expect(page.getByRole("alertdialog")).toContainText("5MB 이하의 JPG 또는 PNG");
    await page.getByRole("alertdialog").getByRole("button", { name: "확인", exact: true }).click();
    expect(requests).toBe(0);
    await picker.setInputFiles(file);
    expect(requests).toBe(0);
    await page.getByRole("button", { name: "변경 사항 저장" }).click();
    await expect(page.getByRole("alertdialog")).toContainText(
        "사진은 저장하지 못했습니다. 이미지 저장 실패",
    );
    await page.getByRole("alertdialog").getByRole("button", { name: "확인", exact: true }).click();
    await expect(page.getByAltText("프로필 사진 미리보기")).toBeVisible();
    await expect(
        page.locator("aside").getByAltText("프로필 사진", { exact: true }),
    ).toHaveAttribute("src", photoUrl);
    await expect(page.getByRole("button", { name: "사진 변경" })).toBeEnabled();
});
