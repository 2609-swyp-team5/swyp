import { beforeEach, describe, expect, it, vi } from "vitest";

const { del, fetchMock, get, post } = vi.hoisted(() => ({
    del: vi.fn(),
    fetchMock: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
}));

vi.mock("@/common/lib/api/client", () => ({
    api: { delete: del, get, post, defaults: { baseURL: "https://api.test" } },
}));

import { productApi } from "./productApi";

const readBlob = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(blob);
    });

const sseResponse = (...events: unknown[]) => {
    const body = new TextEncoder().encode(
        events.map((event) => `data:${JSON.stringify(event)}\n\n`).join(""),
    );

    return {
        ok: true,
        status: 200,
        body: {
            getReader: () => {
                let delivered = false;

                return {
                    read: async () => {
                        if (delivered) {
                            return { done: true, value: undefined };
                        }

                        delivered = true;
                        return { done: false, value: body };
                    },
                    cancel: async () => undefined,
                };
            },
        },
    } as unknown as Response;
};

const completeEvent = () => ({
    success: true,
    message: "",
    data: {
        event: "complete",
        id: 42,
        memberId: 1,
        nickname: "판매자",
        category: { id: 12, name: "태블릿", parentId: null, leaf: true },
        title: "아이패드 프로 11인치",
        brand: "Apple",
        description: "스크래치가 거의 없습니다.",
        price: 800000,
        status: "ON_SALE",
        condition: "B",
        defectStatus: "NORMAL",
        purchasedAt: null,
        purchasedMonths: 6,
        includedItems: [],
        allowPriceSuggestion: false,
        tradeMethod: "DIRECT",
        deliveryType: null,
        preferredTradeRegion: "서울 강남구",
        imageUrls: [],
        tags: [],
        recommendation: null,
        suggestedPrice: null,
        analysisDescription: null,
        platforms: null,
        createdAt: "2026-10-03T00:00:00Z",
        updatedAt: "2026-10-03T00:00:00Z",
    },
    error: null,
});

describe("productApi", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal("fetch", fetchMock);
        fetchMock.mockResolvedValue(sseResponse(completeEvent()));
        get.mockResolvedValue({
            data: {
                success: true,
                message: "",
                data: { id: 42 },
                error: null,
            },
        });
        del.mockResolvedValue({
            data: {
                success: true,
                message: "",
                data: null,
                error: null,
            },
        });
        post.mockResolvedValue({
            data: {
                success: true,
                message: "",
                data: {
                    productPlatformId: 7,
                    productId: 42,
                    externalProductId: "bunjang-123",
                    productUrl: "https://bunjang.co.kr/products/bunjang-123",
                    status: "POSTED",
                    updatedAt: "2026-10-03T00:00:00Z",
                },
                error: null,
            },
        });
    });

    it("gets a product by id", async () => {
        await expect(productApi.getProduct(42)).resolves.toEqual({
            data: {
                success: true,
                message: "",
                data: { id: 42 },
                error: null,
            },
        });
        expect(get).toHaveBeenCalledWith("/products/42");
    });

    it("deletes a product by id", async () => {
        await expect(productApi.deleteProduct(42)).resolves.toEqual({
            data: {
                success: true,
                message: "",
                data: null,
                error: null,
            },
        });
        expect(del).toHaveBeenCalledWith("/products/42");
    });

    it("returns the publish response envelope without handling success in the api adapter", async () => {
        await expect(productApi.publishProduct(42, "BUNJANG")).resolves.toMatchObject({
            data: { success: true },
        });
        expect(post).toHaveBeenCalledWith("/products/42/platforms/BUNJANG/publish");
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

        const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
        const formData = request.body as FormData;
        const requestPart = formData.get("data");

        expect(fetchMock).toHaveBeenCalledWith("https://api.test/products", expect.any(Object));
        expect(request.method).toBe("POST");
        expect(request.headers).toEqual(expect.any(Headers));
        expect((request.headers as Headers).get("Accept")).toBe("text/event-stream");
        expect(request.body).toBe(formData);
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

        const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
        const formData = request.body as FormData;
        expect(fetchMock).toHaveBeenCalledWith(
            "https://api.test/products/analyze",
            expect.any(Object),
        );
        expect(formData.getAll("images")).toEqual(images);
        expect(formData.get("purchasedMonths")).toBe("6");
        expect(formData.get("defectStatus")).toBe("normal");
        expect(formData.getAll("includedItems")).toEqual(["body", "charging-cable"]);
    });

    it("passes SSE step messages to the progress handler and resolves on complete", async () => {
        const onProgress = vi.fn();
        const image = new File(["one"], "one.png", { type: "image/png" });

        fetchMock.mockResolvedValue(
            sseResponse(
                {
                    success: true,
                    message: "이미지 업로드하는 중",
                    data: {
                        event: "step",
                        step: "IMAGE_UPLOAD",
                        status: "START",
                        index: 1,
                        total: 3,
                        result: null,
                    },
                    error: null,
                },
                {
                    success: true,
                    message: "상품 이미지 분석하는 중",
                    data: {
                        event: "step",
                        step: "IMAGE_ANALYSIS",
                        status: "START",
                        index: 2,
                        total: 3,
                        result: null,
                    },
                    error: null,
                },
                completeEvent(),
            ),
        );

        await expect(
            productApi.createAiProduct(
                {
                    images: [image],
                    purchasedMonths: null,
                    operationStatus: "normal",
                    includedItems: [],
                },
                onProgress,
            ),
        ).resolves.toMatchObject({ id: 42 });

        expect(onProgress).toHaveBeenNthCalledWith(1, {
            step: "IMAGE_UPLOAD",
            status: "START",
            index: 1,
            total: 3,
            message: "이미지 업로드하는 중",
        });
        expect(onProgress).toHaveBeenNthCalledWith(2, {
            step: "IMAGE_ANALYSIS",
            status: "START",
            index: 2,
            total: 3,
            message: "상품 이미지 분석하는 중",
        });
    });

    it("passes the failed SSE step to the progress handler before rejecting", async () => {
        const onProgress = vi.fn();
        const image = new File(["one"], "one.png", { type: "image/png" });
        fetchMock.mockResolvedValue(
            sseResponse({
                success: false,
                message: "AI 사진 분석에 실패했어요",
                data: {
                    event: "error",
                    step: "IMAGE_ANALYSIS",
                },
                error: { code: "AI_ANALYSIS_FAILED" },
            }),
        );

        await expect(
            productApi.createAiProduct(
                {
                    images: [image],
                    purchasedMonths: null,
                    operationStatus: "normal",
                    includedItems: [],
                },
                onProgress,
            ),
        ).rejects.toMatchObject({
            message: "AI 사진 분석에 실패했어요",
            code: "AI_ANALYSIS_FAILED",
        });

        expect(onProgress).toHaveBeenCalledWith({
            step: "IMAGE_ANALYSIS",
            status: "ERROR",
            index: 2,
            total: 3,
            message: "AI 사진 분석에 실패했어요",
        });
    });

    it("omits purchasedMonths when AI registration purchase period is unknown", async () => {
        const image = new File(["one"], "one.png", { type: "image/png" });

        await productApi.createAiProduct({
            images: [image],
            purchasedMonths: null,
            operationStatus: "unknown",
            includedItems: ["body"],
        });

        const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
        const formData = request.body as FormData;

        expect(formData.get("purchasedMonths")).toBeNull();
        expect(formData.get("defectStatus")).toBe("unknown");
    });

    it("sends new files and retained image URLs as a multipart update request", async () => {
        const newImage = new File(["new image"], "new-image.jpg", { type: "image/jpeg" });
        const onProgress = vi.fn();

        fetchMock.mockResolvedValue(
            sseResponse(
                {
                    success: true,
                    message: "이미지 1장 업로드 완료",
                    data: {
                        event: "step",
                        step: "IMAGE_UPLOAD",
                        status: "DONE",
                        index: 1,
                        total: 3,
                        result: { imageCount: 1 },
                    },
                    error: null,
                },
                completeEvent(),
            ),
        );

        await productApi.updateProduct(
            42,
            {
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
            },
            onProgress,
        );

        const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
        const formData = request.body as FormData;
        const requestPart = formData.get("data");

        expect(fetchMock).toHaveBeenCalledWith("https://api.test/products/42", expect.any(Object));
        expect(request.method).toBe("PATCH");
        expect(formData.getAll("images")).toEqual([newImage]);
        expect(requestPart).toBeInstanceOf(Blob);
        expect(JSON.parse(await readBlob(requestPart as Blob))).toMatchObject({
            purchasedMonths: 3,
            imageUrls: ["https://example.com/retained-image.jpg"],
            title: "수정된 상품명",
        });
        expect(onProgress).toHaveBeenCalledWith({
            step: "IMAGE_UPLOAD",
            status: "DONE",
            index: 1,
            total: 3,
            message: "이미지 1장 업로드 완료",
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

        const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
        const formData = request.body as FormData;
        const requestPart = formData.get("data");

        expect(request.method).toBe("PATCH");
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

        expect(fetchMock).not.toHaveBeenCalled();
    });
});
