"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { memberApi } from "@/features/member/api/memberApi";

export function useUpdateProfileImageMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (image: File) => {
            const { data } = await memberApi.memberUpdateImage(image);
            if (!data.success) {
                throw new Error(data.message);
            }
            return data.data;
        },
        retry: false,
        onSuccess: async (member) => {
            await queryClient.cancelQueries({ queryKey: ["member", "me"] });
            queryClient.setQueryData(["member", "me"], member);
        },
    });
}
