import { api } from "@/common/lib/api/client";
import type { ApiErrorResponse, ApiResponse, CursorPageResponse } from "@/common/lib/api/types";
import { useAuthStore } from "@/features/auth/store/authStore";
import type {
    ProductAnalysisResponse,
    ProductCompetitionResponse,
    ProductDetailSummaryResponse,
    ProductPriceTrendResponse,
    ProductValuationForecastResponse,
} from "@/features/product-management/schemas/productManagementResponseSchema";
import { productRegisterStreamEventSchema } from "../schemas/productRegisterStreamSchema";

import {
    aiProductCreateInputSchema,
    directProductCreateRequestSchema,
    productImagesSchema,
    productUpdateImagesSchema,
    productUpdateRequestSchema,
} from "../schemas/productSchema";
import type {
    AiProductCreateInput,
    DirectProductCreateInput,
    ProductResponse,
    ProductStatus,
    ProductSummaryResponse,
    ProductRegisterProgress,
    ProductRegisterError,
    ProductRegisterStep,
    ProductPlatformPublishResponse,
    ProductUpdateInput,
} from "../types";
import type { MyPlatformType } from "@/features/my/types";

type ProductRegisterProgressHandler = (progress: ProductRegisterProgress) => void;

const productRegisterSteps: ProductRegisterStep[] = [
    "IMAGE_UPLOAD",
    "IMAGE_ANALYSIS",
    "PRODUCT_SAVE",
];

const getProduct = (id: number) => api.get<ApiResponse<ProductResponse>>(`/products/${id}`);

const getProductManagementSummary = (id: number) =>
    api.get<ApiResponse<ProductDetailSummaryResponse>>(`/products/${id}/summary`);

const getProductAnalysis = (id: number) =>
    api.get<ApiResponse<ProductAnalysisResponse>>(`/products/${id}/analysis`);

const getProductPriceTrend = (id: number) =>
    api.get<ApiResponse<ProductPriceTrendResponse>>(`/products/${id}/analysis/trend`);

const getProductValuationForecast = (id: number, analysisId: number) =>
    api.get<ApiResponse<ProductValuationForecastResponse>>(
        `/products/${id}/analysis/${analysisId}/forecast`,
    );

const getProductCompetition = (id: number) =>
    api.get<ApiResponse<ProductCompetitionResponse>>(`/products/${id}/competition`);

const getMyProducts = (params?: { status?: ProductStatus; cursor?: string; size?: number }) =>
    api.get<ApiResponse<CursorPageResponse<ProductSummaryResponse>>>("/products/me", {
        params: {
            status: params?.status,
            cursor: params?.cursor,
            size: params?.size ?? 20,
        },
    });

const deleteProduct = (id: number) => api.delete<ApiResponse<null>>(`/products/${id}`);

const publishProduct = (productId: number, platform: MyPlatformType) =>
    api.post<ApiResponse<ProductPlatformPublishResponse>>(
        `/products/${productId}/platforms/${platform}/publish`,
    );

const getSseUrl = (path: string) => `${(api.defaults.baseURL ?? "").replace(/\/$/, "")}${path}`;

const createRequestId = () =>
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const parseErrorResponse = async (response: Response) => {
    try {
        const body = (await response.json()) as ApiErrorResponse;
        if (typeof body.message === "string" && body.message.trim()) {
            return body.message;
        }
    } catch {
        // 스트림 시작 전 JSON이 아닌 응답은 일반 오류 문구로 처리
    }

    return "상품 등록 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
};

const readSseStream = async (
    response: Response,
    onProgress?: ProductRegisterProgressHandler,
): Promise<ProductResponse> => {
    if (!response.body) {
        throw new Error("상품 등록 진행 결과를 받을 수 없습니다");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let product: ProductResponse | null = null;

    const handleBlock = (block: string) => {
        const dataLine = block.split(/\r?\n/).find((line) => line.startsWith("data:"));

        if (!dataLine) {
            return;
        }

        const event = productRegisterStreamEventSchema.parse(
            JSON.parse(dataLine.slice("data:".length).trim()),
        );

        if (event.data.event === "step") {
            onProgress?.({
                step: event.data.step,
                status: event.data.status,
                index: event.data.index,
                total: event.data.total,
                message: event.message,
            });
            return;
        }

        if (event.data.event === "complete") {
            product = event.data;
            return;
        }

        if (event.data.step) {
            const stepIndex = productRegisterSteps.indexOf(event.data.step);
            onProgress?.({
                step: event.data.step,
                status: "ERROR",
                index: stepIndex + 1,
                total: productRegisterSteps.length,
                message: event.message,
            });
        }

        const error = new Error(
            event.message || "상품 등록에 실패했습니다",
        ) as ProductRegisterError;
        error.code = event.error?.code;
        throw error;
    };

    try {
        while (true) {
            const { done, value } = await reader.read();
            buffer += decoder.decode(value, { stream: !done });

            const blocks = buffer.split(/\r?\n\r?\n/);
            buffer = blocks.pop() ?? "";
            blocks.forEach(handleBlock);

            if (done) {
                break;
            }
        }

        if (buffer.trim()) {
            handleBlock(buffer);
        }
    } catch (error) {
        await reader.cancel();
        throw error;
    }

    if (!product) {
        throw new Error("상품 등록 결과를 받지 못했습니다 상품 목록에서 등록 여부를 확인해 주세요");
    }

    return product;
};

const createProductWithSse = async (
    path: string,
    formData: FormData,
    onProgress?: ProductRegisterProgressHandler,
    method: "POST" | "PATCH" = "POST",
) => {
    const request = () => {
        const accessToken = useAuthStore.getState().accessToken;
        const headers = new Headers({
            Accept: "text/event-stream",
            "X-Request-Id": createRequestId(),
        });

        if (accessToken) {
            headers.set("Authorization", `Bearer ${accessToken}`);
        }

        return fetch(getSseUrl(path), {
            method,
            headers,
            body: formData,
            credentials: "include",
        });
    };

    let response = await request();
    if (response.status === 401 && useAuthStore.getState().accessToken) {
        await useAuthStore.getState().refresh();
        response = await request();
    }

    if (!response.ok) {
        throw new Error(await parseErrorResponse(response));
    }

    return readSseStream(response, onProgress);
};

const createDirectProduct = async (
    { images, request }: DirectProductCreateInput,
    onProgress?: ProductRegisterProgressHandler,
) => {
    const parsedImages = productImagesSchema.safeParse(images);

    if (!parsedImages.success) {
        throw new Error(
            parsedImages.error.issues[0]?.message ?? "상품 이미지가 올바르지 않습니다.",
        );
    }

    const parsedRequest = directProductCreateRequestSchema.safeParse(request);

    if (!parsedRequest.success) {
        throw new Error(parsedRequest.error.issues[0]?.message ?? "상품 정보가 올바르지 않습니다.");
    }

    const formData = new FormData();

    parsedImages.data.forEach((image) => formData.append("images", image));
    formData.append(
        "data",
        new Blob([JSON.stringify(parsedRequest.data)], { type: "application/json" }),
    );

    return createProductWithSse("/products", formData, onProgress);
};

const createAiProduct = async (
    { images, purchasedMonths, operationStatus, includedItems }: AiProductCreateInput,
    onProgress?: ProductRegisterProgressHandler,
) => {
    const parsedInput = aiProductCreateInputSchema.safeParse({
        images,
        purchasedMonths,
        operationStatus,
        includedItems,
    });

    if (!parsedInput.success) {
        throw new Error(
            parsedInput.error.issues[0]?.message ?? "AI 상품 정보가 올바르지 않습니다.",
        );
    }

    const formData = new FormData();

    parsedInput.data.images.forEach((image) => formData.append("images", image));

    if (parsedInput.data.purchasedMonths !== null) {
        formData.append("purchasedMonths", String(parsedInput.data.purchasedMonths));
    }

    formData.append("defectStatus", parsedInput.data.operationStatus);
    parsedInput.data.includedItems.forEach((item) => formData.append("includedItems", item));

    return createProductWithSse("/products/analyze", formData, onProgress);
};

const updateProduct = async (
    id: number,
    { files, request }: ProductUpdateInput,
    onProgress?: ProductRegisterProgressHandler,
) => {
    const parsedRequest = productUpdateRequestSchema.safeParse(request);

    if (!parsedRequest.success) {
        throw new Error(parsedRequest.error.issues[0]?.message ?? "상품 정보가 올바르지 않습니다.");
    }

    const parsedFiles = productUpdateImagesSchema.safeParse(files);

    if (!parsedFiles.success) {
        throw new Error(parsedFiles.error.issues[0]?.message ?? "상품 이미지가 올바르지 않습니다.");
    }

    if (parsedFiles.data.length + parsedRequest.data.imageUrls.length === 0) {
        throw new Error("상품 사진을 1장 이상 업로드해주세요.");
    }

    const formData = new FormData();

    parsedFiles.data.forEach((file) => formData.append("images", file));
    formData.append(
        "data",
        new Blob([JSON.stringify(parsedRequest.data)], { type: "application/json" }),
    );

    return createProductWithSse(`/products/${id}`, formData, onProgress, "PATCH");
};

export const productApi = {
    getProduct,
    getProductManagementSummary,
    getProductAnalysis,
    getProductPriceTrend,
    getProductValuationForecast,
    getProductCompetition,
    getMyProducts,
    deleteProduct,
    publishProduct,
    createDirectProduct,
    createAiProduct,
    updateProduct,
};
