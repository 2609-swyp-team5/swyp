import type { z } from "zod";

import type { ProductStatus } from "@/features/sell/types";
import type {
    myPlatformConnectionSchema,
    myPlatformConnectionStateSchema,
    myPlatformStatusSchema,
    myPlatformTypeSchema,
    myProductSchema,
    bunjangCarrierSchema,
    bunjangVerificationConfirmResponseSchema,
    bunjangVerificationResponseSchema,
} from "./schemas/myResponseSchema";

export type MyProductStatus = ProductStatus;
export type MyProductFilter = "ALL" | MyProductStatus;

export type MyProduct = z.infer<typeof myProductSchema>;

export type MyPlatformType = z.infer<typeof myPlatformTypeSchema>;
export type MyPlatformStatus = z.infer<typeof myPlatformStatusSchema>;

export type MyPlatformConnectionState = z.infer<typeof myPlatformConnectionStateSchema>;

export type MyPlatformConnection = z.infer<typeof myPlatformConnectionSchema>;
export type BunjangCarrier = z.infer<typeof bunjangCarrierSchema>;

export type BunjangVerificationRequest = {
    name: string;
    birthDate: string;
    genderDigit: string;
    carrier: BunjangCarrier;
    phone: string;
    agreedToBunjangTerms: boolean;
};

export type BunjangVerificationResponse = z.infer<typeof bunjangVerificationResponseSchema>;

export type BunjangVerificationConfirmResponse = z.infer<
    typeof bunjangVerificationConfirmResponseSchema
>;

export type MyPlatformConnectionAction = { platform: MyPlatformType; action: "disconnect" };
