import { api } from "@/common/lib/api/client";
import { resizeImagesForUpload } from "@/common/lib/image/resizeImageForUpload";
import type { ApiErrorResponse, ApiResponse, CursorPageResponse } from "@/common/lib/api/types";
import { useAuthStore } from "@/features/auth/store/authStore";
import type {
    ProductAnalysisResponse,
    ProductAnalysisRequestResponse,
    ProductCompetitionResponse,
    ProductDetailSummaryResponse,
    ProductPriceDistributionResponse,
    ProductPriceTrendResponse,
    ProductValuationForecastResponse,
    ProductTargetPriceResponse,
} from "@/features/product-management/schemas/productManagementResponseSchema";
import { productAnalysisResponseSchema } from "@/features/product-management/schemas/productManagementResponseSchema";
import {
    productAnalysisStreamEventSchema,
    type ProductAnalysisStreamResult,
    type ProductAnalysisStreamStep,
} from "@/features/product-management/schemas/productAnalysisStreamSchema";
import {
    type MarketAnalysisProgress,
    marketAnalysisProgressSchema,
    productRegisterStreamEventSchema,
} from "../schemas/productRegisterStreamSchema";

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
    ProductStatusUpdateRequest,
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
type ProductAnalysisStreamProgressHandler = (
    progress: Omit<ProductAnalysisStreamStep, "event"> & {
        message: string;
    },
) => void;

const productRegisterSteps: ProductRegisterStep[] = [
    "IMAGE_UPLOAD",
    "IMAGE_ANALYSIS",
    "PRODUCT_SAVE",
    "MARKET_ANALYSIS",
];

const getProduct = (id: number) => api.get<ApiResponse<ProductResponse>>(`/products/${id}`);

const getProductManagementSummary = (id: number) =>
    api.get<ApiResponse<ProductDetailSummaryResponse>>(`/products/${id}/summary`);

const getProductAnalysis = (id: number, perspective?: "SELL" | "BUY") =>
    api.get<ApiResponse<ProductAnalysisResponse>>(`/products/${id}/analysis`, {
        params: perspective ? { perspective } : undefined,
    });

const requestProductAnalysis = (id: number, force = false) =>
    api.post<ApiResponse<ProductAnalysisRequestResponse>>(`/products/${id}/analysis`, undefined, {
        params: { force },
    });

const getProductPriceTrend = (id: number) =>
    api.get<ApiResponse<ProductPriceTrendResponse>>(`/products/${id}/analysis/trend`);

const getProductPriceDistribution = (id: number, days = 90) =>
    api.get<ApiResponse<ProductPriceDistributionResponse>>(
        `/products/${id}/analysis/distribution`,
        { params: { days } },
    );

const getProductValuationForecast = (id: number) =>
    api.get<ApiResponse<ProductValuationForecastResponse>>(`/products/${id}/analysis/forecast`);

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

const getProductTargetPrice = (id: number) =>
    api.get<ApiResponse<ProductTargetPriceResponse>>(`/products/${id}/target-price`);

const updateProductPrice = (id: number, price: number) =>
    api.patch<ApiResponse<ProductResponse>>(`/products/${id}/price`, { price });

// null이면 목표 판매가 해제
const setProductTargetPrice = (id: number, targetPrice: number | null) =>
    api.patch<ApiResponse<ProductTargetPriceResponse>>(`/products/${id}/target-price`, {
        targetPrice,
    });

const deleteProduct = (id: number) => api.delete<ApiResponse<null>>(`/products/${id}`);

const updateProductStatus = (id: number, request: ProductStatusUpdateRequest) =>
    api.patch<ApiResponse<ProductResponse>>(`/products/${id}/status`, request);

const publishProduct = (productId: number, platform: MyPlatformType) =>
    api.post<ApiResponse<ProductPlatformPublishResponse>>(
        `/products/${productId}/platforms/${platform}/publish`,
    );

const getSseUrl = (path: string) => `${(api.defaults.baseURL ?? "").replace(/\/$/, "")}${path}`;

const createRequestId = () =>
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const parseErrorResponse = async (
    response: Response,
    fallbackMessage = "상품 등록 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
) => {
    try {
        const body = (await response.json()) as ApiErrorResponse;
        if (typeof body.message === "string" && body.message.trim()) {
            return body.message;
        }
    } catch {
        // 스트림 시작 전 JSON이 아닌 응답은 일반 오류 문구로 처리
    }

    return fallbackMessage;
};

const readProductAnalysisStream = async (
    response: Response,
    onProgress?: ProductAnalysisStreamProgressHandler,
): Promise<ProductAnalysisStreamResult> => {
    if (!response.body) {
        throw new Error("시세 분석 진행 결과를 받을 수 없습니다.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: ProductAnalysisStreamResult | null = null;

    const handleBlock = (block: string) => {
        const dataLine = block.split(/\r?\n/).find((line) => line.startsWith("data:"));

        if (!dataLine) {
            return;
        }

        const event = productAnalysisStreamEventSchema.parse(
            JSON.parse(dataLine.slice("data:".length).trim()),
        );

        if (!event.success) {
            throw new Error(event.error?.message || event.message || "시세 분석에 실패했습니다.");
        }

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

        const { analysisStatus, analysisId, recommendation } = event.data;
        const analysisResponse = Object.fromEntries(
            Object.entries(event.data).filter(
                ([key]) =>
                    !["event", "analysisStatus", "analysisId", "recommendation"].includes(key),
            ),
        );
        const hasAnalysis =
            analysisStatus === "ANALYZED" && analysisId !== null && recommendation !== null;

        result = {
            analysisStatus,
            analysis: hasAnalysis
                ? productAnalysisResponseSchema.parse({
                      ...analysisResponse,
                      analysisId,
                      recommendation,
                  })
                : null,
            message: event.message,
        };
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

    if (!result) {
        throw new Error("시세 분석 결과를 받지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }

    return result;
};

const streamProductAnalysis = async (
    id: number,
    perspective: "SELL" | "BUY" = "SELL",
    onProgress?: ProductAnalysisStreamProgressHandler,
    signal?: AbortSignal,
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

        return fetch(getSseUrl(`/products/${id}/analysis/stream?perspective=${perspective}`), {
            method: "GET",
            headers,
            credentials: "include",
            signal,
        });
    };

    let response = await request();
    if (response.status === 401 && useAuthStore.getState().accessToken && !signal?.aborted) {
        await useAuthStore.getState().refresh();
        response = await request();
    }

    if (!response.ok) {
        throw new Error(
            await parseErrorResponse(response, "시세 분석 진행 상황을 불러오지 못했습니다."),
        );
    }

    return readProductAnalysisStream(response, onProgress);
};

/** 저장은 끝났는데 결과를 받기 전에 연결이 끊긴 경우 — 서버 시간 초과(REGISTER_TIMEOUT)와 같이 다시 시도 없이 상품 확인으로 안내한다. */
const savedButDisconnectedError = () => {
    const error = new Error(
        "연결이 끊겼지만 저장은 완료됐어요. 상품을 확인해 주세요.",
    ) as ProductRegisterError;
    error.code = "REGISTER_TIMEOUT";
    return error;
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
    // 오류 이벤트에는 전체 단계 수가 없어 마지막 step 이벤트의 값을 쓴다(시세 분석 단계 유무에 따라 3 또는 4)
    let lastTotal = productRegisterSteps.length;
    // 시세 분석 단계의 마지막 세부 단계(DONE·SKIP 이벤트에도 함께 넘겨 어디까지 진행됐는지 그린다)
    let marketAnalysis: MarketAnalysisProgress | null = null;
    // 서버는 저장을 시작하면 연결이 끊겨도 끝까지 저장한다 — 저장 완료 뒤 끊기면 다시 시도(중복 등록)를 막는다
    let saved = false;

    const handleBlock = (block: string) => {
        const dataLine = block.split(/\r?\n/).find((line) => line.startsWith("data:"));

        if (!dataLine) {
            return;
        }

        const event = productRegisterStreamEventSchema.parse(
            JSON.parse(dataLine.slice("data:".length).trim()),
        );

        if (event.data.event === "step") {
            lastTotal = event.data.total;
            if (event.data.step === "PRODUCT_SAVE" && event.data.status === "DONE") {
                saved = true;
            }
            const isMarketAnalysis = event.data.step === "MARKET_ANALYSIS";
            if (isMarketAnalysis && event.data.status === "PROGRESS") {
                const parsed = marketAnalysisProgressSchema.safeParse(event.data.result);
                marketAnalysis = parsed.success ? parsed.data : marketAnalysis;
            }
            onProgress?.({
                step: event.data.step,
                status: event.data.status,
                index: event.data.index,
                total: event.data.total,
                message: event.message,
                ...(isMarketAnalysis ? { marketAnalysis } : {}),
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
                total: lastTotal,
                message: event.message,
            });
        }

        const error = new Error(
            event.message || "상품 등록에 실패했습니다",
        ) as ProductRegisterError;
        error.code = event.error?.code;
        throw error;
    };

    const read = async () => {
        try {
            return await reader.read();
        } catch {
            // 네트워크 끊김은 브라우저 원문(Failed to fetch 등) 대신 저장 여부에 맞는 안내로 바꾼다
            throw saved
                ? savedButDisconnectedError()
                : new Error("연결이 끊겼어요. 다시 시도해 주세요.");
        }
    };

    try {
        while (true) {
            const { done, value } = await read();
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
        await reader.cancel().catch(() => undefined);
        throw error;
    }

    if (!product) {
        if (saved) {
            throw savedButDisconnectedError();
        }
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

    // 업로드 전에 사진을 줄인다(서버 업로드 한도·AI 분석 요청 크기 안에 들도록)
    (await resizeImagesForUpload(parsedImages.data)).forEach((image) =>
        formData.append("images", image),
    );
    formData.append(
        "data",
        new Blob([JSON.stringify(parsedRequest.data)], { type: "application/json" }),
    );

    // 저장 뒤 시세 분석까지 같은 스트림으로 기다린다(완료 화면에서 AI 시세 분석을 바로 보여 주기 위함)
    return createProductWithSse("/products?withMarketAnalysis=true", formData, onProgress);
};

const createAiProduct = async (
    {
        images,
        condition,
        includedStatus,
        tradeMethod,
        deliveryType,
        deliveryFee,
        preferredTradeRegion,
    }: AiProductCreateInput,
    onProgress?: ProductRegisterProgressHandler,
) => {
    const parsedInput = aiProductCreateInputSchema.safeParse({
        images,
        condition,
        includedStatus,
        tradeMethod,
        deliveryType,
        deliveryFee,
        preferredTradeRegion,
    });

    if (!parsedInput.success) {
        throw new Error(
            parsedInput.error.issues[0]?.message ?? "AI 상품 정보가 올바르지 않습니다.",
        );
    }

    const formData = new FormData();

    (await resizeImagesForUpload(parsedInput.data.images)).forEach((image) =>
        formData.append("images", image),
    );

    if (parsedInput.data.condition) {
        formData.append("condition", parsedInput.data.condition);
    }

    if (parsedInput.data.includedStatus) {
        formData.append("includedStatus", parsedInput.data.includedStatus);
    }

    if (tradeMethod) {
        formData.append("tradeMethod", tradeMethod === "DIRECT" ? "DIRECT" : "DELIVERY");
    }

    if (deliveryType) {
        formData.append("deliveryType", deliveryType);
    }

    if (deliveryFee != null) {
        formData.append("deliveryFee", String(deliveryFee));
    }

    if (preferredTradeRegion?.trim()) {
        formData.append("preferredTradeRegion", preferredTradeRegion.trim());
    }

    return createProductWithSse("/products/analyze?withMarketAnalysis=true", formData, onProgress);
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

    (await resizeImagesForUpload(parsedFiles.data)).forEach((file) =>
        formData.append("images", file),
    );
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
    requestProductAnalysis,
    streamProductAnalysis,
    getProductPriceTrend,
    getProductPriceDistribution,
    getProductValuationForecast,
    getProductCompetition,
    getMyProducts,
    getProductTargetPrice,
    updateProductPrice,
    setProductTargetPrice,
    deleteProduct,
    updateProductStatus,
    publishProduct,
    createDirectProduct,
    createAiProduct,
    updateProduct,
};
