"use client";

import { useMutation } from "@tanstack/react-query";

import { searchApi } from "@/features/search/api/searchApi";
import { aiSearchResponseSchema } from "@/features/search/schemas/searchResponseSchema";

export function useAiSearchMutation() {
    return useMutation({
        mutationFn: async (query: string) => {
            const { data } = await searchApi.aiSearch(query);
            if (!data.success) throw new Error(data.message);
            return aiSearchResponseSchema.parse(data.data);
        },
        retry: false,
    });
}
