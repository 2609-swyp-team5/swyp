import { describe, expect, it } from "vitest";

import { isOptimizableImageUrl } from "./optimizableImage";

describe("isOptimizableImageUrl", () => {
    it("optimizes our uploaded images on R2", () => {
        expect(
            isOptimizableImageUrl(
                "https://pub-1c28f9f257104a95a472df628512abaf.r2.dev/products/a.jpg",
            ),
        ).toBe(true);
    });

    it("optimizes bundled raster images but not SVGs", () => {
        expect(isOptimizableImageUrl("/onboarding/hero.png")).toBe(true);
        expect(isOptimizableImageUrl("/figma/ai-warning-icon.svg")).toBe(false);
    });

    it("keeps external listing images, previews and unknown hosts as they are", () => {
        expect(isOptimizableImageUrl("https://media.bunjang.co.kr/product/1_1_wres.jpg")).toBe(
            false,
        );
        expect(isOptimizableImageUrl("https://img2.joongna.com/media/a.jpg")).toBe(false);
        expect(isOptimizableImageUrl("blob:http://localhost:3000/abc")).toBe(false);
        expect(isOptimizableImageUrl("http://localhost:8081/files/a.jpg")).toBe(false);
        expect(isOptimizableImageUrl("http://pub-x.r2.dev/a.jpg")).toBe(false);
        expect(isOptimizableImageUrl("//pub-x.r2.dev/a.jpg")).toBe(false);
        expect(isOptimizableImageUrl("not a url")).toBe(false);
    });
});
