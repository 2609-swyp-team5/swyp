"use client";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { cn } from "@/common/lib/utils";

import { useAiChatSuggestionsQuery } from "../hooks/queries/useAiChatSuggestionsQuery";

const sourceText: Record<string, string> = {
    MY_PRODUCT: "내 판매 상품으로 만든 질문",
    INTEREST: "관심 상품으로 만든 질문",
    TRENDING: "인기 검색어로 만든 질문",
    DEFAULT: "기본 질문",
};

/** 추천 질문 칩 — 누르면 그 질문을 바로 보낸다. */
export function AiChatSuggestionChips({
    onAsk,
    align = "center",
    disabled = false,
}: {
    onAsk: (question: string) => void;
    align?: "center" | "start";
    disabled?: boolean;
}) {
    const suggestions = useAiChatSuggestionsQuery();

    return (
        <div
            className={cn(
                "flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-5",
                align === "center" ? "items-center md:justify-center" : "items-start",
            )}
        >
            <p className="typography-body-bold text-[#464646]">추천 질문</p>
            <div
                className={cn(
                    "flex flex-wrap gap-2",
                    align === "center" ? "justify-center" : "justify-start",
                )}
            >
                {suggestions.isPending ? (
                    <span role="status" className="typography-body-small text-[#83889e]">
                        추천 질문을 불러오는 중이에요.
                    </span>
                ) : suggestions.isError ? (
                    <span role="alert" className="typography-body-small text-[#fa503d]">
                        {getApiErrorMessage(suggestions.error)}
                    </span>
                ) : (
                    suggestions.data.map((item) => (
                        <button
                            key={item.question}
                            type="button"
                            title={sourceText[item.source]}
                            disabled={disabled}
                            onClick={() => onAsk(item.question)}
                            className="typography-body-bold-small rounded-full border border-[#d3d3d3] bg-[#eaeafd] px-3 py-1.5 font-normal text-[#545d82] transition-colors hover:border-[#6653fb] hover:text-[#6653fb] disabled:opacity-50"
                        >
                            {item.question}
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
