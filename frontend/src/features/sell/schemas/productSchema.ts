import { z } from "zod";

export const PRODUCT_PRICE_MIN = 500;
export const PRODUCT_PRICE_MAX = 100_000_000;
export const PRODUCT_PRICE_RANGE_ERROR = "희망 가격은 500원 이상 1억 원 이하로 입력해 주세요.";

export const productConditionSchema = z.enum(["S", "A", "B", "C", "D"]);
export const productStatusSchema = z.enum(["DRAFT", "ON_SALE", "RESERVED", "SOLD_OUT"]);
export const defectStatusSchema = z.enum(["NORMAL", "ISSUES", "UNKNOWN"]);
export const tradeMethodSchema = z.enum(["DIRECT", "DELIVERY"]);
export const deliveryTypeSchema = z.enum(["INCLUDED", "PREPAID"]);
export const includedItemStatusSchema = z.enum(["NONE", "PARTIAL", "ALL"]);
export const productPlatformStatusSchema = z.enum(["POSTING", "POSTED", "FAILED", "REMOVED"]);

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

export const productUpdateImagesSchema = z
    .array(productImageFileSchema)
    .max(10, "상품 사진은 최대 10장까지 업로드할 수 있어요.");

export const productCreateRequestSchema = z.object({
    categoryId: z.number().int().positive("카테고리를 선택해 주세요."),
    title: z.string().trim().min(1, "상품명을 입력해 주세요.").max(100),
    brand: z.string().trim().nullable(),
    description: z.string().trim().min(1, "상품 설명을 입력해 주세요."),
    price: z.number().int().nonnegative("희망 가격을 입력해 주세요."),
    condition: productConditionSchema,
    includedItems: z.array(z.string()).max(10, "구성품은 최대 10개까지 추가할 수 있습니다."),
    allowPriceSuggestion: z.boolean(),
    tradeMethod: tradeMethodSchema,
    deliveryType: deliveryTypeSchema.nullable(),
    preferredTradeRegion: z.string().trim().nullable(),
    imageUrls: z.array(z.string().trim().min(1)).min(1, "상품 이미지가 필요합니다."),
    tags: z.array(z.string().trim().min(1)).max(10, "태그는 최대 10개까지 추가할 수 있습니다."),
});

export const directProductCreateRequestSchema = productCreateRequestSchema
    .omit({
        imageUrls: true,
        brand: true,
        includedItems: true,
    })
    .extend({
        title: z.string().trim().min(2, "상품명은 2글자 이상 입력해 주세요.").max(100),
        description: z
            .string()
            .trim()
            .min(10, "상품 설명은 10자 이상 입력해 주세요.")
            .max(2499, "상품 설명은 2500자 미만으로 입력해 주세요."),
        price: z
            .number()
            .int()
            .min(PRODUCT_PRICE_MIN, PRODUCT_PRICE_RANGE_ERROR)
            .max(PRODUCT_PRICE_MAX, PRODUCT_PRICE_RANGE_ERROR),
        tags: z.array(z.string().trim().min(1)).max(5, "태그는 최대 5개까지 추가할 수 있습니다."),
        includedStatus: includedItemStatusSchema,
        deliveryFee: z
            .number()
            .int()
            .min(2_700, "배송비는 2,700원 이상 입력해 주세요.")
            .max(17_000, "배송비는 17,000원 이하로 입력해 주세요.")
            .nullable(),
    })
    .superRefine((request, context) => {
        if (request.tradeMethod === "DELIVERY" && !request.deliveryType) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["deliveryType"],
                message: "배송비 부담 방식을 선택해 주세요.",
            });
        }

        if (request.tradeMethod === "DELIVERY" && request.deliveryType === "PREPAID") {
            if (request.deliveryFee === null) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["deliveryFee"],
                    message: "배송비를 입력해 주세요.",
                });
            }
        } else if (request.deliveryFee !== null) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["deliveryFee"],
                message: "배송비는 배송비 별도일 때만 입력할 수 있어요.",
            });
        }

        if (request.tradeMethod === "DIRECT" && !request.preferredTradeRegion?.trim()) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["preferredTradeRegion"],
                message: "거래 희망 지역을 선택해 주세요.",
            });
        }
    });

export const productUpdateRequestSchema = productCreateRequestSchema
    .omit({ includedItems: true })
    .extend({
        title: z.string().trim().min(2, "상품명은 2글자 이상 입력해 주세요.").max(100),
        description: z
            .string()
            .trim()
            .min(10, "상품 설명은 10자 이상 입력해 주세요.")
            .max(2499, "상품 설명은 2500자 미만으로 입력해 주세요."),
        status: productStatusSchema,
        price: z
            .number()
            .int()
            .min(PRODUCT_PRICE_MIN, PRODUCT_PRICE_RANGE_ERROR)
            .max(PRODUCT_PRICE_MAX, PRODUCT_PRICE_RANGE_ERROR),
        imageUrls: z.array(z.string().trim().min(1)),
        includedStatus: includedItemStatusSchema,
        deliveryFee: z
            .number()
            .int()
            .min(2_700, "배송비는 2,700원 이상 입력해 주세요.")
            .max(17_000, "배송비는 17,000원 이하로 입력해 주세요.")
            .nullable(),
    })
    .superRefine((request, context) => {
        if (request.tradeMethod === "DELIVERY" && !request.deliveryType) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["deliveryType"],
                message: "배송비 부담 방식을 선택해 주세요.",
            });
        }

        if (request.tradeMethod === "DELIVERY" && request.deliveryType === "PREPAID") {
            if (request.deliveryFee === null) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["deliveryFee"],
                    message: "배송비를 입력해 주세요.",
                });
            }
        } else if (request.deliveryFee !== null) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["deliveryFee"],
                message: "배송비는 배송비 별도일 때만 입력할 수 있어요.",
            });
        }

        if (request.tradeMethod === "DIRECT" && !request.preferredTradeRegion?.trim()) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["preferredTradeRegion"],
                message: "거래 희망 지역을 선택해 주세요.",
            });
        }
    });

export const aiProductCreateInputSchema = z.object({
    images: productImagesSchema,
    // AI가 분석한 상태 대신 사용자가 선택한 상품 상태를 우선 적용할 수 있도록 전달한다.
    condition: productConditionSchema.optional(),
    includedStatus: includedItemStatusSchema.optional(),
    // AI 등록 거래 방식은 백엔드가 받을 수 있도록 먼저 FE 입력 모델에 반영한다.
    tradeMethod: tradeMethodSchema.optional(),
    deliveryType: deliveryTypeSchema.nullable().optional(),
    deliveryFee: z
        .number()
        .int()
        .min(2_700, "배송비는 2,700원 이상 입력해 주세요.")
        .max(17_000, "배송비는 17,000원 이하로 입력해 주세요.")
        .nullable()
        .optional(),
    preferredTradeRegion: z.string().trim().nullable().optional(),
});
