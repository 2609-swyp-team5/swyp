import { z } from "zod";

import { interestSourceSchema } from "./interestSchema";

// 하트 표시·토글에 필요한 최소 필드만 검증한다(관심상품 목록 화면용 스키마와 분리)
export const interestToggleItemSchema = z.object({
    interestId: z.number(),
    source: interestSourceSchema,
    targetId: z.number(),
});

export const interestToggleListResponseSchema = z.object({
    content: z.array(interestToggleItemSchema),
    nextCursor: z.string().nullable(),
    hasNext: z.boolean(),
});

export const interestTargetSchema = interestToggleItemSchema.omit({ interestId: true });
