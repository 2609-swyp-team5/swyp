import { LoaderCircle, Sparkles } from "lucide-react";

import type { SearchParams } from "@/features/search/types";

const statusLabels = {
    DRAFT: "임시저장",
    ON_SALE: "판매중",
    RESERVED: "예약중",
    SOLD_OUT: "판매완료",
};
const platformLabels = { BUNJANG: "번개장터", OUR: "지금이니?!" };
const conditionLabels = {
    S: "미개봉",
    A: "거의 새 상품",
    B: "사용감 적음",
    C: "사용감 있음",
    D: "수리 필요",
};
const defectLabels = { NORMAL: "하자 없음", ISSUES: "하자 있음", UNKNOWN: "하자 여부 미확인" };
const sortLabels = {
    LATEST: "최신순",
    RECOMMENDED: "추천순",
    INTEREST: "관심순",
    PRICE_HIGH: "높은 가격순",
    PRICE_LOW: "낮은 가격순",
};

export function AiSearchSummary({
    query,
    isLoading,
    aiApplied,
    params,
}: {
    query: string;
    isLoading: boolean;
    aiApplied?: boolean;
    params: SearchParams;
}) {
    const statuses = typeof params.status === "string" ? [params.status] : (params.status ?? []);
    const conditions = [
        ...(params.keyword ? [`포함: ${params.keyword}`] : []),
        ...(params.excludeKeyword ? [`제외: ${params.excludeKeyword}`] : []),
        ...(params.minPrice !== undefined
            ? [`${params.minPrice.toLocaleString("ko-KR")}원 이상`]
            : []),
        ...(params.maxPrice !== undefined
            ? [`${params.maxPrice.toLocaleString("ko-KR")}원 이하`]
            : []),
        ...statuses.map((status) => statusLabels[status]),
        ...(params.platform ?? []).map((platform) => platformLabels[platform]),
        ...(params.condition ?? []).map((condition) => conditionLabels[condition]),
        ...(params.defectStatus ?? []).map((defect) => defectLabels[defect]),
        ...(params.sort && params.sort !== "LATEST" ? [sortLabels[params.sort]] : []),
    ];

    return (
        <section
            aria-label="AI 검색 안내"
            className="rounded-2xl border border-[#e2ddff] bg-[#f8f6ff] p-5 sm:p-6"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 text-[#6653fb]">
                    {isLoading ? (
                        <LoaderCircle
                            aria-hidden="true"
                            className="size-5 shrink-0 motion-safe:animate-spin"
                        />
                    ) : (
                        <Sparkles aria-hidden="true" className="size-5 shrink-0" />
                    )}
                    <h2 className="text-sm leading-6 font-semibold break-keep sm:text-base">
                        {isLoading
                            ? "AI가 질문을 이해하고 있어요"
                            : aiApplied
                              ? "AI가 해석한 검색 조건"
                              : "일반검색으로 결과를 찾았어요"}
                    </h2>
                </div>
            </div>
            <p className="mt-3 text-base break-words text-[#363636]">“{query}”</p>
            {isLoading ? (
                <p role="status" className="mt-2 text-sm text-[#6b7395]">
                    질문을 이해하고 상품을 찾고 있어요.
                </p>
            ) : (
                <>
                    <p role="status" className="mt-2 text-sm text-[#6b7395]">
                        {aiApplied
                            ? "아래 조건으로 찾았어요. 필터를 수정하면 적용된 조건도 함께 바뀝니다."
                            : "AI 해석을 적용하지 못해 일반검색 결과를 보여드려요."}
                    </p>
                    <ul aria-label="적용된 검색 조건" className="mt-4 flex flex-wrap gap-2">
                        {conditions.map((condition) => (
                            <li
                                key={condition}
                                className="rounded-full border border-[#e2ddff] bg-white px-3 py-1.5 text-sm break-all text-[#545d82]"
                            >
                                {condition}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
}
