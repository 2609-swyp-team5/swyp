import { beforeEach, describe, expect, it, vi } from "vitest";

const { del, fetchMock, get, patch, post } = vi.hoisted(() => ({
    del: vi.fn(),
    fetchMock: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
}));

vi.mock("@/common/lib/api/client", () => ({
    api: { delete: del, get, patch, post, defaults: { baseURL: "https://api.test" } },
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

const analysisStreamCompleteEvent = (analysisStatus: "ANALYZED" | "ANALYZING" = "ANALYZED") => ({
    success: true,
    message: "시세 분석 결과를 확인했어요.",
    data:
        analysisStatus === "ANALYZED"
            ? {
                  event: "complete",
                  productId: 42,
                  currentPrice: 800000,
                  analysisId: 12,
                  minPrice: 650000,
                  averagePrice: 750000,
                  maxPrice: 900000,
                  marketPriceDiffRate: 6.7,
                  changeRate: null,
                  recommendation: "SELL",
                  suggestedPrice: 780000,
                  description: "지금 판매를 추천해요.",
                  buyerRecommendation: "WAIT",
                  buyerDescription: "조금 더 기다려 보세요.",
                  analyzedAt: "2026-10-14T12:00:00",
                  confidence: "HIGH",
                  confidenceRate: 90,
                  listingCount: 12,
                  comparisonBasis: "SAME",
                  waitPeriod: null,
                  expectedPrice: 760000,
                  expectedPriceChangeRate: -1.2,
                  forecasts: [],
                  marketExpectedPrice: 760000,
                  priceDistribution: [],
                  summary: {
                      type: "SALE_STATS",
                      salesDurationDays: 8,
                      viewCount: 120,
                      interestCount: 10,
                  },
                  analysisStatus: "ANALYZED",
                  analysisSkipReason: null,
                  analysisSkipMessage: null,
              }
            : {
                  event: "complete",
                  productId: 42,
                  currentPrice: 800000,
                  analysisId: null,
                  recommendation: null,
                  analysisStatus: "ANALYZING",
                  analysisSkipReason: null,
                  analysisSkipMessage: null,
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
        patch.mockResolvedValue({
            data: {
                success: true,
                message: "",
                data: { id: 42, status: "SOLD_OUT" },
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

    it("gets completed-sale price distribution for a product", async () => {
        await expect(productApi.getProductPriceDistribution(42)).resolves.toMatchObject({
            data: { success: true },
        });

        expect(get).toHaveBeenCalledWith("/products/42/analysis/distribution", {
            params: { days: 90 },
        });
    });

    it("subscribes to market-analysis SSE and parses steps and the completed analysis", async () => {
        const onProgress = vi.fn();
        fetchMock.mockResolvedValue(
            sseResponse(
                {
                    success: true,
                    message: "비교할 매물을 찾고 있어요.",
                    data: {
                        event: "step",
                        step: "CANDIDATE_SEARCH",
                        status: "START",
                        index: 1,
                        total: 5,
                    },
                    error: null,
                },
                analysisStreamCompleteEvent(),
            ),
        );

        await expect(
            productApi.streamProductAnalysis(42, "SELL", onProgress),
        ).resolves.toMatchObject({
            analysisStatus: "ANALYZED",
            analysis: {
                analysisId: 12,
                recommendation: "SELL",
                suggestedPrice: 780000,
            },
        });

        expect(onProgress).toHaveBeenCalledWith({
            step: "CANDIDATE_SEARCH",
            status: "START",
            index: 1,
            total: 5,
            message: "비교할 매물을 찾고 있어요.",
        });
        expect(fetchMock).toHaveBeenCalledWith(
            "https://api.test/products/42/analysis/stream?perspective=SELL",
            expect.objectContaining({
                method: "GET",
                credentials: "include",
            }),
        );
        const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect((request.headers as Headers).get("Accept")).toBe("text/event-stream");
    });

    it("keeps a timeout completion without an analysis as an analyzing result", async () => {
        fetchMock.mockResolvedValue(sseResponse(analysisStreamCompleteEvent("ANALYZING")));

        await expect(productApi.streamProductAnalysis(42)).resolves.toEqual({
            analysisStatus: "ANALYZING",
            analysis: null,
            message: "시세 분석 결과를 확인했어요.",
        });
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

    it("updates a product listing status", async () => {
        const request = {
            status: "SOLD_OUT" as const,
            soldPrice: 300000,
            soldPlatform: "번개장터",
        };

        await expect(productApi.updateProductStatus(42, request)).resolves.toEqual({
            data: {
                success: true,
                message: "",
                data: { id: 42, status: "SOLD_OUT" },
                error: null,
            },
        });
        expect(patch).toHaveBeenCalledWith("/products/42/status", request);
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
                description: "스크래치가 거의 없습니다.",
                price: 800000,
                condition: "B",
                includedStatus: "ALL",
                allowPriceSuggestion: false,
                tradeMethod: "DIRECT",
                deliveryType: null,
                deliveryFee: null,
                preferredTradeRegion: "서울 강남구",
                tags: ["애플", "아이패드"],
            },
        });

        const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
        const formData = request.body as FormData;
        const requestPart = formData.get("data");

        expect(fetchMock).toHaveBeenCalledWith(
            "https://api.test/products?withMarketAnalysis=true",
            expect.any(Object),
        );
        expect(request.method).toBe("POST");
        expect(request.headers).toEqual(expect.any(Headers));
        expect((request.headers as Headers).get("Accept")).toBe("text/event-stream");
        expect(request.body).toBe(formData);
        expect(formData.getAll("images")).toEqual(images);
        expect(requestPart).toBeInstanceOf(Blob);
        expect(JSON.parse(await readBlob(requestPart as Blob))).toMatchObject({
            categoryId: 12,
            includedStatus: "ALL",
            deliveryFee: null,
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
            condition: "A",
            includedStatus: "PARTIAL",
            tradeMethod: "DELIVERY",
            deliveryType: "INCLUDED",
            deliveryFee: null,
            preferredTradeRegion: null,
        });

        const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
        const formData = request.body as FormData;
        expect(fetchMock).toHaveBeenCalledWith(
            "https://api.test/products/analyze?withMarketAnalysis=true",
            expect.any(Object),
        );
        expect(formData.getAll("images")).toEqual(images);
        expect(formData.get("purchasedMonths")).toBeNull();
        expect(formData.get("defectStatus")).toBeNull();
        expect(formData.get("includedStatus")).toBe("PARTIAL");
        expect(formData.get("condition")).toBe("A");
        expect(formData.get("tradeMethod")).toBe("DELIVERY");
        expect(formData.get("deliveryType")).toBe("INCLUDED");
        expect(formData.get("deliveryFee")).toBeNull();
        expect(formData.get("preferredTradeRegion")).toBeNull();
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
                    includedStatus: "ALL",
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
                    includedStatus: "ALL",
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
            total: 4, // 앞선 step 이벤트가 없으면 등록 단계 수(시세 분석 포함)
            message: "AI 사진 분석에 실패했어요",
        });
    });

    it("sends the selected included status without legacy condition fields", async () => {
        const image = new File(["one"], "one.png", { type: "image/png" });

        await productApi.createAiProduct({
            images: [image],
            includedStatus: "PARTIAL",
        });

        const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
        const formData = request.body as FormData;

        expect(formData.get("includedStatus")).toBe("PARTIAL");
        expect(formData.get("purchasedMonths")).toBeNull();
        expect(formData.get("defectStatus")).toBeNull();
        expect(formData.get("includedItems")).toBeNull();
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
                    brand: null,
                    description: "수정된 설명",
                    price: 700000,
                    status: "ON_SALE",
                    condition: "A",
                    includedStatus: "ALL",
                    allowPriceSuggestion: true,
                    tradeMethod: "DIRECT",
                    deliveryType: null,
                    deliveryFee: null,
                    preferredTradeRegion: "서울 강남구",
                    imageUrls: ["https://example.com/retained-image.jpg"],
                    tags: ["애플"],
                    includedItems: ["전체 포함"],
                    categoryOptions: [],
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
            includedStatus: "ALL",
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

    it("sends the delivery fee when an edit uses separate shipping", async () => {
        const image = new File(["image"], "image.jpg", { type: "image/jpeg" });

        fetchMock.mockResolvedValue(sseResponse(completeEvent()));

        await productApi.updateProduct(42, {
            files: [image],
            request: {
                categoryId: 12,
                title: "수정된 상품명",
                brand: null,
                description: "수정된 설명",
                price: 700000,
                status: "ON_SALE",
                condition: "A",
                includedStatus: "ALL",
                allowPriceSuggestion: true,
                tradeMethod: "DELIVERY",
                deliveryType: "PREPAID",
                deliveryFee: 3000,
                preferredTradeRegion: null,
                imageUrls: [],
                tags: ["애플"],
                includedItems: ["전체 포함"],
                categoryOptions: [],
            },
        });

        const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
        const formData = request.body as FormData;
        const requestPart = formData.get("data");

        expect(JSON.parse(await readBlob(requestPart as Blob))).toMatchObject({
            tradeMethod: "DELIVERY",
            deliveryType: "PREPAID",
            deliveryFee: 3000,
            preferredTradeRegion: null,
        });
    });

    it("allows updates that replace every existing image with new files", async () => {
        const newImage = new File(["new image"], "new-image.jpg", { type: "image/jpeg" });

        await productApi.updateProduct(42, {
            files: [newImage],
            request: {
                categoryId: 12,
                title: "수정된 상품명",
                brand: null,
                description: "수정된 설명",
                price: 700000,
                status: "ON_SALE",
                condition: "A",
                includedStatus: "NONE",
                allowPriceSuggestion: true,
                tradeMethod: "DIRECT",
                deliveryType: null,
                deliveryFee: null,
                preferredTradeRegion: "서울 강남구",
                imageUrls: [],
                tags: [],
                includedItems: ["없음"],
                categoryOptions: [],
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
                    brand: null,
                    description: "수정된 설명",
                    price: 700000,
                    status: "ON_SALE",
                    condition: "A",
                    includedStatus: "NONE",
                    allowPriceSuggestion: true,
                    tradeMethod: "DIRECT",
                    deliveryType: null,
                    deliveryFee: null,
                    preferredTradeRegion: "서울 강남구",
                    imageUrls: [],
                    tags: [],
                    includedItems: ["없음"],
                    categoryOptions: [],
                },
            }),
        ).rejects.toThrow("상품 사진을 1장 이상 업로드해주세요.");

        expect(fetchMock).not.toHaveBeenCalled();
    });
});
