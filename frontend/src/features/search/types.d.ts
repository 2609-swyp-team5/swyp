import type { z } from "zod";
import type {
    interestItemSchema,
    interestListResponseSchema,
    interestTargetSchema,
    interestCreateResponseSchema,
} from "./schemas/interestResponseSchema";

export type InterestItem = z.infer<typeof interestItemSchema>;
export type InterestListResponse = z.infer<typeof interestListResponseSchema>;
export type InterestTarget = z.infer<typeof interestTargetSchema>;
export type InterestCreateResponse = z.infer<typeof interestCreateResponseSchema>;

import type {
    aiSearchResponseSchema,
    searchProductDetailSchema,
    searchResponseSchema,
    searchResultItemSchema,
    searchStatusSchema,
} from "./schemas/searchResponseSchema";

export type AiSearchResponse = z.infer<typeof aiSearchResponseSchema>;

// 우리 상품과 외부 매물의 거래 상태 필터
export type SearchStatus = z.infer<typeof searchStatusSchema>;
export type SearchPlatform = "ALL" | "BUNJANG" | "OUR";
export type SearchSort = "RECOMMENDED" | "LATEST" | "INTEREST" | "PRICE_HIGH" | "PRICE_LOW";
export type SearchCondition = "S" | "A" | "B" | "C" | "D";
export type SearchDefectStatus = "NORMAL" | "ISSUES" | "UNKNOWN";

// 상품 목록 조회 요청 파라미터
export interface SearchParams {
    keyword?: string;
    excludeKeyword?: string;
    status?: SearchStatus | SearchStatus[];
    platform?: Exclude<SearchPlatform, "ALL">[];
    minPrice?: number;
    maxPrice?: number;
    condition?: SearchCondition[];
    defectStatus?: SearchDefectStatus[];
    sort?: SearchSort;
    cursor?: string;
    size?: number;
}

// 우리 상품과 외부 매물의 통합 목록 항목
export type SearchResultItem = z.infer<typeof searchResultItemSchema>;

// 커서 기반 상품 목록 조회 결과
export type SearchResponse = z.infer<typeof searchResponseSchema>;

export type SearchProductDetail = z.infer<typeof searchProductDetailSchema>;
