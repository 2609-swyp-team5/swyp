import { beforeEach, describe, expect, it, vi } from "vitest";

const { post } = vi.hoisted(() => ({
    post: vi.fn(),
}));

vi.mock("@/common/lib/api/client", () => ({
    api: { post },
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
        post.mockResolvedValue({
            data: {
                success: true,
                message: "",
                data: {},
                error: null,
            },
        });
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

        expect(post).toHaveBeenCalledWith("/products", formData);
        expect(formData.getAll("images")).toEqual(images);
        expect(requestPart).toBeInstanceOf(Blob);
        expect(JSON.parse(await readBlob(requestPart as Blob))).toMatchObject({
            categoryId: 12,
            brand: "Apple",
            includedItems: ["body", "charging-cable"],
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
});
