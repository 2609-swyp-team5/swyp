"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { myApi } from "@/features/my/api/myApi";
import type { MyPlatformConnection, MyPlatformConnectionAction } from "@/features/my/types";

export function useUpdatePlatformConnectionMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: MyPlatformConnectionAction) => {
            const { data } = await myApi.disconnectPlatform(params.platform);
            if (!data.success) throw new Error(data.message);
            return { platform: params.platform, status: "DISCONNECTED" as const, updatedAt: null };
        },
        retry: false,
        onSuccess: async (connection) => {
            await queryClient.cancelQueries({ queryKey: ["my-platforms"] });
            queryClient.setQueryData<MyPlatformConnection[]>(["my-platforms"], (current) =>
                current?.map((item) =>
                    item.platform === connection.platform ? { ...item, ...connection } : item,
                ),
            );
            await queryClient.invalidateQueries({ queryKey: ["my-platforms"] });
        },
    });
}
