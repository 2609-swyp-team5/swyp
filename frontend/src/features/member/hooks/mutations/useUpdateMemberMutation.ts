"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { memberApi } from "@/features/member/api/memberApi";
import type { MemberUpdateRequest } from "@/features/member/types";

export function useUpdateMemberMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: MemberUpdateRequest) => {
            const { data } = await memberApi.memberUpdate(params);
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
