import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import {
    aiProductCreateInputSchema,
    directProductCreateRequestSchema,
    productImagesSchema,
} from "../schemas/productSchema";
import type { AiProductCreateInput, DirectProductCreateInput, ProductResponse } from "../types";

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

    const { data } = await api.post<ApiResponse<ProductResponse>>("/products", formData);

    if (!data.success) {
        throw new Error(data.message);
    }

    return data.data;
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

    const { data } = await api.post<ApiResponse<ProductResponse>>("/products/analyze", formData, {
        timeout: 120_000,
    });

    if (!data.success) {
        throw new Error(data.message);
    }

    return data.data;
};

export const productApi = {
    createDirectProduct,
    createAiProduct,
};
