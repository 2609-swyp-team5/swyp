"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { myApi } from "@/features/my/api/myApi";
import {
    bunjangVerificationConfirmResponseSchema,
    bunjangVerificationResponseSchema,
} from "@/features/my/schemas/myResponseSchema";
import type { BunjangVerificationRequest, MyPlatformType } from "@/features/my/types";

type RequestVerificationInput = {
    platform: MyPlatformType;
    request: BunjangVerificationRequest;
};

type ConfirmVerificationInput = {
    platform: MyPlatformType;
    verificationId: string;
    otp: string;
};

export function useBunjangVerificationMutation() {
    const queryClient = useQueryClient();

    const request = useMutation({
        mutationFn: async ({ platform, request: input }: RequestVerificationInput) => {
            const { data } = await myApi.requestBunjangVerification(platform, input);
            if (!data.success) throw new Error(data.message);
            return bunjangVerificationResponseSchema.parse(data.data);
        },
        retry: false,
    });

    const confirm = useMutation({
        mutationFn: async ({ platform, verificationId, otp }: ConfirmVerificationInput) => {
            const { data } = await myApi.confirmBunjangVerification(platform, verificationId, otp);
            if (!data.success) throw new Error(data.message);
            const result = bunjangVerificationConfirmResponseSchema.parse(data.data);

            if (result.status === "EXPIRED") {
                throw new Error("인증번호가 만료되었습니다. 인증번호를 다시 요청해 주세요.");
            }

            if (result.status !== "CONNECTED") {
                throw new Error("플랫폼 연결에 실패했습니다. 다시 시도해 주세요.");
            }

            return result;
        },
        retry: false,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["my-platforms"] });
        },
    });

    return { request, confirm };
}
