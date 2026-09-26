import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, patch, post } = vi.hoisted(() => ({
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
}));

vi.mock("@/common/lib/api/client", () => ({
    api: { get, patch, post },
}));

import { productApi } from "./productApi";

const readBlob = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(blob);
    });

describe("productApi", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        get.mockResolvedValue({
            data: {
                success: true,
                message: "",
                data: { id: 42 },
                error: null,
            },
        });
        post.mockResolvedValue({
            data: {
                success: true,
                message: "",
                data: {},
                error: null,
            },
        });
        patch.mockResolvedValue({
            data: {
                success: true,
                message: "",
                data: { id: 42 },
                error: null,
            },
        });
    });

    it("gets a product by id", async () => {
        await expect(productApi.getProduct(42)).resolves.toEqual({ id: 42 });
        expect(get).toHaveBeenCalledWith("/products/42");
    });

    it("sends direct-registration images and data JSON as multipart fields", async () => {
        const images = [
            new File(["one"], "one.jpg", { type: "image/jpeg" }),
            new File(["two"], "two.jpg", { type: "image/jpeg" }),
        ];

        await productApi.createDirectProduct({
            images,
            request: {
                categoryId: 12,
                title: "아이패드 프로 11인치",
                brand: "Apple",
                description: "스크래치가 거의 없습니다.",
                price: 800000,
                condition: "B",
                defectStatus: "NORMAL",
                purchasedMonths: 6,
                includedItems: ["body", "charging-cable"],
                allowPriceSuggestion: false,
                tradeMethod: "DIRECT",
                deliveryType: null,
                preferredTradeRegion: "서울 강남구",
                tags: ["애플", "아이패드"],
            },
        });

        const [, formData] = post.mock.calls[0] as [string, FormData];
        const requestPart = formData.get("data");

        expect(post).toHaveBeenCalledWith("/products", formData, {
            timeout: 120_000,
        });
        expect(formData.getAll("images")).toEqual(images);
        expect(requestPart).toBeInstanceOf(Blob);
        expect(JSON.parse(await readBlob(requestPart as Blob))).toMatchObject({
            categoryId: 12,
            brand: "Apple",
            includedItems: ["body", "charging-cable"],
            tags: ["애플", "아이패드"],
            title: "아이패드 프로 11인치",
        });
    });

    it("sends AI registration values as multipart fields", async () => {
        const images = [
            new File(["one"], "one.png", { type: "image/png" }),
            new File(["two"], "two.png", { type: "image/png" }),
        ];

        await productApi.createAiProduct({
            images,
            purchasedMonths: 6,
            operationStatus: "normal",
            includedItems: ["body", "charging-cable"],
        });

        const [, formData] = post.mock.calls[0] as [string, FormData];
        expect(post).toHaveBeenCalledWith("/products/analyze", formData, {
            timeout: 120_000,
        });
        expect(formData.getAll("images")).toEqual(images);
        expect(formData.get("purchasedMonths")).toBe("6");
        expect(formData.get("defectStatus")).toBe("normal");
        expect(formData.getAll("includedItems")).toEqual(["body", "charging-cable"]);
    });

    it("omits purchasedMonths when AI registration purchase period is unknown", async () => {
        const image = new File(["one"], "one.png", { type: "image/png" });

        await productApi.createAiProduct({
            images: [image],
            purchasedMonths: null,
            operationStatus: "unknown",
            includedItems: ["body"],
        });

        const [, formData] = post.mock.calls[0] as [string, FormData];

        expect(formData.get("purchasedMonths")).toBeNull();
        expect(formData.get("defectStatus")).toBe("unknown");
    });

    it("sends new files and retained image URLs as a multipart update request", async () => {
        const newImage = new File(["new image"], "new-image.jpg", { type: "image/jpeg" });

        await productApi.updateProduct(42, {
            files: [newImage],
            request: {
                categoryId: 12,
                title: "수정된 상품명",
                brand: "Apple",
                description: "수정된 설명",
                price: 700000,
                status: "ON_SALE",
                condition: "A",
                purchasedMonths: 3,
                defectStatus: "NORMAL",
                allowPriceSuggestion: true,
                tradeMethod: "DIRECT",
                deliveryType: null,
                preferredTradeRegion: "서울 강남구",
                imageUrls: ["https://example.com/retained-image.jpg"],
                tags: ["애플"],
                includedItems: ["body"],
            },
        });

        const [, formData] = patch.mock.calls[0] as [string, FormData];
        const requestPart = formData.get("data");

        expect(patch).toHaveBeenCalledWith("/products/42", formData);
        expect(formData.getAll("images")).toEqual([newImage]);
        expect(requestPart).toBeInstanceOf(Blob);
        expect(JSON.parse(await readBlob(requestPart as Blob))).toMatchObject({
            purchasedMonths: 3,
            imageUrls: ["https://example.com/retained-image.jpg"],
            title: "수정된 상품명",
        });
    });

    it("allows updates that replace every existing image with new files", async () => {
        const newImage = new File(["new image"], "new-image.jpg", { type: "image/jpeg" });

        await productApi.updateProduct(42, {
            files: [newImage],
            request: {
                categoryId: 12,
                title: "수정된 상품명",
                brand: "Apple",
                description: "수정된 설명",
                price: 700000,
                status: "ON_SALE",
                condition: "A",
                purchasedMonths: null,
                defectStatus: "NORMAL",
                allowPriceSuggestion: true,
                tradeMethod: "DIRECT",
                deliveryType: null,
                preferredTradeRegion: null,
                imageUrls: [],
                tags: [],
                includedItems: [],
            },
        });

        const [, formData] = patch.mock.calls[0] as [string, FormData];
        const requestPart = formData.get("data");

        expect(formData.getAll("images")).toEqual([newImage]);
        expect(JSON.parse(await readBlob(requestPart as Blob))).toMatchObject({ imageUrls: [] });
    });

    it("rejects updates that have neither retained nor new images", async () => {
        await expect(
            productApi.updateProduct(42, {
                files: [],
                request: {
                    categoryId: 12,
                    title: "수정된 상품명",
                    brand: "Apple",
                    description: "수정된 설명",
                    price: 700000,
                    status: "ON_SALE",
                    condition: "A",
                    purchasedMonths: null,
                    defectStatus: "NORMAL",
                    allowPriceSuggestion: true,
                    tradeMethod: "DIRECT",
                    deliveryType: null,
                    preferredTradeRegion: null,
                    imageUrls: [],
                    tags: [],
                    includedItems: [],
                },
            }),
        ).rejects.toThrow("상품 사진을 1장 이상 업로드해주세요.");

        expect(patch).not.toHaveBeenCalled();
    });
});
