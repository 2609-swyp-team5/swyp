import { test, expect } from "./fixtures";

test("onboarding reveals sections on scroll while keeping its entry immediately visible", async ({
    page,
}, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
    });
    await page.addInitScript(() => localStorage.setItem("auth:loggedOut", "true"));
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "지금 팔까, 더 갖고 있을까?" })).toBeVisible();
    await expect(page.getByRole("link", { name: "시작하기", exact: true })).toBeVisible();
    expect(
        await page
            .locator("#steps-heading")
            .evaluate((heading) => heading.getBoundingClientRect().top),
    ).toBeGreaterThanOrEqual(page.viewportSize()!.height);
    await expect(
        page.getByAltText("돋보기로 물건을 살펴보는 AI 캐릭터").locator("../../../.."),
    ).toHaveCSS("opacity", "1");
    await expect(
        page.getByRole("heading", { name: "지금 팔까, 더 갖고 있을까?" }).locator("../../.."),
    ).toHaveCSS("transform", "none");
    await page.screenshot({ path: testInfo.outputPath("onboarding-hero.png") });

    for (const title of [
        "이렇게 사용해요",
        /시세부터 실거래까지/,
        "파는 사람에게도, 사는 사람에게도",
    ]) {
        const heading = page.getByRole("heading", { name: title, exact: true });
        await heading.scrollIntoViewIfNeeded();
        await expect(heading.locator("..")).toBeVisible();
        await expect(heading.locator("../..")).toHaveCSS("opacity", "1");
    }
    const firstCard = page.locator("article").first();
    await firstCard.scrollIntoViewIfNeeded();
    await expect(firstCard).toHaveCSS("opacity", "1");
    await expect(firstCard).toHaveCSS("transform", "none");
    const firstImage = firstCard.locator("img");
    const firstDescription = firstCard.locator("p");
    await page.mouse.move(0, 0);
    await expect(firstDescription).toHaveCSS("opacity", "0");
    await firstCard.hover();
    await expect(firstCard).toHaveCSS("transform", "none");
    await expect(firstImage).toHaveCSS("transform", "matrix(1.12, 0, 0, 1.12, 0, 0)");
    await expect(firstDescription).toHaveCSS("opacity", "1");
    await expect(firstDescription).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    await page.mouse.move(0, 0);
    await expect(firstDescription).toHaveCSS("opacity", "0");
    await firstCard.focus();
    await expect(firstDescription).toHaveCSS("opacity", "1");
    await page.screenshot({ path: testInfo.outputPath("onboarding-cards.png") });
    expect(errors).toEqual([]);
});

test("mobile reduced-motion users can read the cards without horizontal overflow", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
    const heroImage = page.getByAltText("돋보기로 물건을 살펴보는 AI 캐릭터");
    await expect(heroImage.locator("../..")).toHaveCSS("transform", "none");
    await expect(heroImage.locator("../../..")).toHaveCSS("transform", "none");
    const card = page.locator("article").first();
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveCSS("opacity", "1");
    await expect(card).toHaveCSS("transform", "none");
    await expect(card.locator("p")).toHaveCSS("opacity", "1");
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.addStyleTag({
        content: "section[aria-labelledby='audiences-heading'] article { min-height: 600px; }",
    });
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.getByRole("button", { name: "맨 위로 이동" }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.getByRole("link", { name: "지금 시작하기" }).scrollIntoViewIfNeeded();
    await page.getByRole("link", { name: "지금 시작하기" }).click();
    await expect(page).toHaveURL(/\/home$/);
});

test("the character floats and follows the mouse, then returns to its resting tilt", async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const image = page.getByAltText("돋보기로 물건을 살펴보는 AI 캐릭터");
    const hero = image.locator("../../../..");
    const tilt = image.locator("../../..");
    await expect(hero).toHaveCSS("opacity", "1");
    await expect(image.locator("../..")).not.toHaveCSS("transform", "none");
    const bounds = await hero.boundingBox();
    expect(bounds).not.toBeNull();
    await page.mouse.move(bounds!.x + bounds!.width * 0.8, bounds!.y + bounds!.height * 0.3);
    await expect(tilt).not.toHaveCSS("transform", "none");
    await page.mouse.move(0, 0);
    await expect(tilt).toHaveCSS("transform", "none");
});

test("smooth wheel scrolling is scoped to onboarding and respects reduced motion", async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/lenis/);
    await page.mouse.move(100, 400);
    await page.mouse.wheel(0, 500);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(450);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.locator("html")).toHaveClass(/lenis/);

    await page.getByRole("link", { name: "시작하기", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
});

test("onboarding buttons keep their behavior with the Figma scroll-to-top design", async ({
    page,
}, testInfo) => {
    await page.addInitScript(() => localStorage.setItem("auth:loggedOut", "true"));
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const header = page.locator("header");
    const start = page.getByRole("link", { name: "시작하기", exact: true });
    await start.scrollIntoViewIfNeeded();
    await expect(start.locator("..")).toHaveCSS("transform", "none");
    await start.hover();
    await expect(start).toHaveCSS("translate", "0px -4px");
    await expect(start).not.toHaveCSS("box-shadow", "none");
    await page.mouse.move(100, 400);
    await page.mouse.wheel(0, 900);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(800);
    await expect(header).toHaveCSS("position", "static");
    await expect(header).toHaveCSS("box-shadow", "none");

    const topButton = page.getByRole("button", { name: "맨 위로 이동" });
    await expect(topButton).toHaveCSS("position", "fixed");
    await expect(topButton).toHaveCSS("width", "70px");
    await expect(topButton).toHaveCSS("height", "70px");
    await expect(topButton.locator("svg")).toBeVisible();
    await expect(topButton.getByText("바로가기")).toBeVisible();
    await expect(topButton.locator("img")).toHaveCount(0);
    await topButton.hover();
    await expect(topButton).toHaveCSS("translate", "0px -4px");
    await expect(topButton).not.toHaveCSS("box-shadow", "none");
    await expect(topButton.locator("span").first()).toHaveCSS("opacity", "1");
    await page.screenshot({ path: testInfo.outputPath("onboarding-scrolled.png") });
    await topButton.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    await start.click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(header).toHaveCSS("position", "static");
    await expect(topButton).toHaveCount(0);
});

test("the first screen remains readable without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
        const page = await context.newPage();
        await page.goto("/");
        await expect(
            page.getByRole("heading", { name: "지금 팔까, 더 갖고 있을까?" }),
        ).toBeVisible();
        await expect(page.getByRole("link", { name: "시작하기", exact: true })).toBeVisible();
    } finally {
        await context.close();
    }
});

test("hero and final-section text reveal together, with the next section below the first screen", async ({
    page,
}) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    expect(
        await page
            .locator("#steps-heading")
            .evaluate((heading) => heading.getBoundingClientRect().top),
    ).toBeGreaterThanOrEqual(900);

    const hero = page.locator("main > section").first();
    await expect(hero.locator('[style*="clip-path"]')).toHaveCount(0);
    await expect(hero.locator("h1").locator("../../..")).toHaveCSS("transform", "none");
    for (const section of [page.locator("main > section").last()]) {
        await section.scrollIntoViewIfNeeded();
        const text = section.locator('[style*="clip-path"]');
        await expect
            .poll(() => text.first().evaluate((element) => getComputedStyle(element).clipPath))
            .not.toBe("inset(100% 0px 0px)");
        const clips = await text.evaluateAll((elements) =>
            elements.map((element) => getComputedStyle(element).clipPath),
        );
        expect(clips.length).toBeGreaterThanOrEqual(3);
        expect(new Set(clips).size).toBe(1);
        await expect(text.first()).toHaveCSS("clip-path", "inset(-16px)");
    }
});
