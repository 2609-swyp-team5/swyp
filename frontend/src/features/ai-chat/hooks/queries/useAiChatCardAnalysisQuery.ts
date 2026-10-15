"use client";

import { useQuery } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";

import { aiChatCardAnalysisQueryKey } from "../../queryKeys";
import type { AiChatAnalysisCard } from "../../schemas/aiChatSchema";

/**
 * 답변 시점에 분석 결과가 없어 서버가 분석을 요청한 카드(ANALYZING)는 분석 결과 스트림으로 끝나기를 기다린다.
 * 내 상품이면 판매자, 아니면 구매자 관점 결과를 받는다.
 */
export function useAiChatCardAnalysisQuery(card: AiChatAnalysisCard) {
    const perspective = card.mine ? "SELL" : "BUY";
    return useQuery({
        queryKey: aiChatCardAnalysisQueryKey(card.productId, perspective),
        queryFn: ({ signal }) =>
            productApi.streamProductAnalysis(card.productId, perspective, undefined, signal),
        enabled: card.recommendation === null && card.analysisStatus === "ANALYZING",
        staleTime: Infinity,
        retry: false,
    });
}
