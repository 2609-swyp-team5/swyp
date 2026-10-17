import { afterEach, describe, expect, it, vi } from "vitest";

import { fitWithin, resizeImageForUpload, resizeImagesForUpload } from "./resizeImageForUpload";

const photo = (size: number, type = "image/jpeg", name = "photo.jpg") =>
    new File([new Uint8Array(size)], name, { type, lastModified: 1_700_000_000_000 });

/** 브라우저 이미지 API를 흉내 낸다: 원본 크기(width×height)로 읽히고, toBlob은 화질별로 정해 둔 크기의 JPEG를 돌려준다. */
const mockBrowserImage = (
    width: number,
    height: number,
    blobSizeByQuality: (quality: number) => number,
) => {
    const close = vi.fn();
    vi.stubGlobal(
        "createImageBitmap",
        vi.fn(async () => ({ width, height, close })),
    );
    const context = { fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() };
    const canvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => context),
        toBlob: vi.fn((callback: (blob: Blob | null) => void, _type: string, quality: number) =>
            callback(
                new Blob([new Uint8Array(blobSizeByQuality(quality))], { type: "image/jpeg" }),
            ),
        ),
    };
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) =>
        tag === "canvas" ? (canvas as unknown as HTMLCanvasElement) : realCreateElement(tag),
    );
    return { canvas, context, close };
};

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("fitWithin", () => {
    it("shrinks the long side to the limit and keeps the ratio", () => {
        expect(fitWithin(4032, 3024, 1920)).toEqual({ width: 1920, height: 1440 });
        expect(fitWithin(3024, 4032, 1920)).toEqual({ width: 1440, height: 1920 });
    });

    it("keeps images that already fit", () => {
        expect(fitWithin(1280, 960, 1920)).toEqual({ width: 1280, height: 960 });
    });
});

describe("resizeImageForUpload", () => {
    it("shrinks a large phone photo into a smaller JPEG", async () => {
        const { canvas, context, close } = mockBrowserImage(4032, 3024, () => 600 * 1024);
        const original = photo(6 * 1024 * 1024, "image/png", "IMG_0001.png");

        const resized = await resizeImageForUpload(original);

        expect(canvas.width).toBe(1920);
        expect(canvas.height).toBe(1440);
        expect(context.fillRect).toHaveBeenCalled(); // 투명 PNG를 위한 흰 배경
        expect(resized.type).toBe("image/jpeg");
        expect(resized.name).toBe("IMG_0001.jpg");
        expect(resized.size).toBe(600 * 1024);
        expect(createImageBitmap).toHaveBeenCalledWith(original, {
            imageOrientation: "from-image",
        });
        expect(close).toHaveBeenCalled();
    });

    it("lowers the quality until the photo is under the target size", async () => {
        const sizes: Record<number, number> = {
            0.82: 1500 * 1024,
            0.72: 1100 * 1024,
            0.62: 800 * 1024,
        };
        const { canvas } = mockBrowserImage(4000, 3000, (quality) => sizes[quality]);

        const resized = await resizeImageForUpload(photo(5 * 1024 * 1024));

        expect(canvas.toBlob).toHaveBeenCalledTimes(3);
        expect(resized.size).toBe(800 * 1024);
    });

    it("keeps a photo that is already small", async () => {
        const { canvas } = mockBrowserImage(1280, 960, () => 100);
        const original = photo(300 * 1024);

        expect(await resizeImageForUpload(original)).toBe(original);
        expect(canvas.toBlob).not.toHaveBeenCalled();
    });

    it("keeps the original when re-encoding does not make it smaller", async () => {
        mockBrowserImage(3000, 2000, () => 2 * 1024 * 1024);
        const original = photo(1024 * 1024);

        expect(await resizeImageForUpload(original)).toBe(original);
    });

    it("keeps the original when the browser cannot decode it", async () => {
        vi.stubGlobal(
            "createImageBitmap",
            vi.fn(async () => {
                throw new Error("decode failed");
            }),
        );
        const original = photo(5 * 1024 * 1024);

        expect(await resizeImageForUpload(original)).toBe(original);
    });

    it("keeps the original when image APIs are unavailable or the type is not a photo", async () => {
        vi.stubGlobal("createImageBitmap", undefined);
        const original = photo(5 * 1024 * 1024);
        expect(await resizeImageForUpload(original)).toBe(original);

        mockBrowserImage(4000, 3000, () => 100);
        const gif = photo(5 * 1024 * 1024, "image/gif", "a.gif");
        expect(await resizeImageForUpload(gif)).toBe(gif);
    });

    it("uses a smaller limit when given", async () => {
        const { canvas } = mockBrowserImage(3000, 3000, () => 200 * 1024);

        await resizeImageForUpload(photo(3 * 1024 * 1024), { maxSide: 1024 });

        expect(canvas.width).toBe(1024);
        expect(canvas.height).toBe(1024);
    });
});

describe("resizeImagesForUpload", () => {
    it("resizes every photo in order", async () => {
        mockBrowserImage(4000, 3000, () => 500 * 1024);

        const resized = await resizeImagesForUpload([
            photo(5 * 1024 * 1024, "image/jpeg", "a.jpg"),
            photo(6 * 1024 * 1024, "image/jpeg", "b.jpg"),
        ]);

        expect(resized.map((file) => file.name)).toEqual(["a.jpg", "b.jpg"]);
        expect(resized.every((file) => file.size === 500 * 1024)).toBe(true);
    });
});
