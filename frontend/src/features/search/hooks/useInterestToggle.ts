"use client";

import { useState } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useMeQuery } from "@/features/member/hooks/queries/useMeQuery";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useAllInterestsQuery } from "./queries/useAllInterestsQuery";
import { useToggleInterestMutation } from "./mutations/useToggleInterestMutation";
import type { InterestTarget } from "@/features/search/types";

export function useInterestToggle() {
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const member = useMeQuery();
    const memberId = isLoggedIn ? member.data?.memberId : undefined;
    const interests = useAllInterestsQuery(memberId);
    const mutation = useToggleInterestMutation(memberId);
    const [loginNoticeOpen, setLoginNoticeOpen] = useState(false);
    const queryError = isLoggedIn ? member.error || interests.error : null;
    const isLoading = !isInitialized || (isLoggedIn && (member.isPending || interests.isPending));

    return {
        interests: isLoggedIn ? (interests.data ?? []) : [],
        disabled: isLoading || Boolean(queryError) || mutation.isPending,
        loginNoticeOpen: !isLoggedIn && loginNoticeOpen,
        onLoginNoticeOpenChange: setLoginNoticeOpen,
        errorMessage: queryError
            ? getApiErrorMessage(queryError)
            : mutation.error
              ? getApiErrorMessage(mutation.error)
              : null,
        canRetry: Boolean(queryError),
        retry: () => void (member.error ? member.refetch() : interests.refetch()),
        toggle: (target: InterestTarget) => {
            if (!isLoggedIn) {
                setLoginNoticeOpen(true);
                return;
            }
            if (isLoading || queryError || mutation.isPending || memberId === undefined) return;
            const interest = interests.data?.find(
                (item) => item.source === target.source && item.targetId === target.targetId,
            );
            mutation.mutate({ ...target, interestId: interest?.interestId });
        },
    };
}
