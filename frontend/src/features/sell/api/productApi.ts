import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

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
    ProductUpdateInput,
} from "../types";

const getProduct = (id: number) => api.get<ApiResponse<ProductResponse>>(`/products/${id}`);

const deleteProduct = (id: number) => api.delete<ApiResponse<null>>(`/products/${id}`);

const createDirectProduct = async ({ images, request }: DirectProductCreateInput) => {
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

    return api.post<ApiResponse<ProductResponse>>("/products", formData, {
        timeout: 120_000,
    });
};

const createAiProduct = async ({
    images,
    purchasedMonths,
    operationStatus,
    includedItems,
}: AiProductCreateInput) => {
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

    return api.post<ApiResponse<ProductResponse>>("/products/analyze", formData, {
        timeout: 120_000,
    });
};

const updateProduct = async (id: number, { files, request }: ProductUpdateInput) => {
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

    return api.patch<ApiResponse<ProductResponse>>(`/products/${id}`, formData);
};

export const productApi = {
    getProduct,
    deleteProduct,
    createDirectProduct,
    createAiProduct,
    updateProduct,
};
