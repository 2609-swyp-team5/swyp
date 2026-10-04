import type { z } from "zod";

import type { ProductStatus } from "@/features/sell/types";
import type {
    myPlatformConnectionSchema,
    myPlatformConnectionStateSchema,
    myPlatformStatusSchema,
    myPlatformTypeSchema,
    myProductSchema,
} from "./schemas/myResponseSchema";

export type MyProductStatus = ProductStatus;
export type MyProductFilter = "ALL" | MyProductStatus;

export type MyProduct = z.infer<typeof myProductSchema>;

export type MyPlatformType = z.infer<typeof myPlatformTypeSchema>;
export type MyPlatformStatus = z.infer<typeof myPlatformStatusSchema>;

export type MyPlatformConnectionState = z.infer<typeof myPlatformConnectionStateSchema>;

export type MyPlatformConnection = z.infer<typeof myPlatformConnectionSchema>;

export type MyPlatformConnectionAction =
    | { platform: MyPlatformType; action: "connect"; cookie: string }
    | { platform: MyPlatformType; action: "disconnect" };
