"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { memberApi } from "@/features/member/api/memberApi";

export function useDeleteProfileImageMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const { data } = await memberApi.memberDeleteImage();
            if (!data.success) throw new Error(data.message);
            return data.data;
        },
        retry: false,
        onSuccess: async (member) => {
            await queryClient.cancelQueries({ queryKey: ["member", "me"] });
            queryClient.setQueryData(["member", "me"], member);
        },
    });
}
