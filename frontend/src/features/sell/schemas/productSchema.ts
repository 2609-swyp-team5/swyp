import { z } from "zod";

export const productConditionSchema = z.enum(["S", "A", "B", "C", "D"]);
export const productStatusSchema = z.enum(["ON_SALE", "RESERVED", "SOLD_OUT", "HIDDEN"]);
export const defectStatusSchema = z.enum(["NORMAL", "ISSUES", "UNKNOWN"]);
export const tradeMethodSchema = z.enum(["DIRECT", "DELIVERY"]);
export const deliveryTypeSchema = z.enum(["INCLUDED", "PREPAID"]);
export const operationStatusSchema = z.enum(["normal", "issues", "unknown"]);

const productImageFileSchema = z
    .custom<File>(
        (value) => typeof File !== "undefined" && value instanceof File,
        "상품 이미지 파일이 올바르지 않습니다.",
    )
    .refine(
        (file) => ["image/jpeg", "image/png"].includes(file.type),
        "JPG 또는 PNG 파일만 업로드할 수 있어요.",
    )
    .refine((file) => file.size <= 20 * 1024 * 1024, "파일 크기는 20MB 이하만 업로드할 수 있어요.");

export const productImagesSchema = z
    .array(productImageFileSchema)
    .min(1, "상품 사진을 1장 이상 업로드해주세요.")
    .max(10, "상품 사진은 최대 10장까지 업로드할 수 있어요.");

export const productCreateRequestSchema = z.object({
    categoryId: z.number().int().positive("카테고리를 선택해 주세요."),
    title: z.string().trim().min(1, "상품명을 입력해 주세요.").max(100),
    brand: z.string().trim().nullable(),
    description: z.string().trim().min(1, "상품 설명을 입력해 주세요."),
    price: z.number().int().nonnegative("희망 가격을 입력해 주세요."),
    condition: productConditionSchema,
    defectStatus: defectStatusSchema,
    purchasedMonths: z.number().int().min(0).max(6).nullable(),
    includedItems: z.array(z.string()),
    allowPriceSuggestion: z.boolean(),
    tradeMethod: tradeMethodSchema,
    deliveryType: deliveryTypeSchema.nullable(),
    preferredTradeRegion: z.string().trim().nullable(),
    imageUrls: z.array(z.string().trim().min(1)).min(1, "상품 이미지가 필요합니다."),
    tags: z.array(z.string().trim().min(1)),
});

export const directProductCreateRequestSchema = productCreateRequestSchema.omit({
    imageUrls: true,
});

export const aiProductCreateInputSchema = z.object({
    images: productImagesSchema,
    purchasedMonths: z.number().int().min(0).max(6).nullable(),
    operationStatus: operationStatusSchema,
    includedItems: z.array(z.string()),
});
