"use client";

import { useRef, useState } from "react";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useToggleInterestMutation } from "@/features/interest/hooks/mutations/useToggleInterestMutation";
import type { InterestTarget } from "@/features/interest/types";
import { useMeQuery } from "@/features/member/hooks/queries/useMeQuery";

const targetKey = (target: InterestTarget) => `${target.source}:${target.targetId}`;

type InterestToggleOptions = {
    /** 조회 응답에 포함된 관심 ID. null이면 새 관심상품으로 등록한다. */
    interestId: number | null;
    onAdd?: () => void;
    onAddFailed?: () => void;
};

/** 홈·검색·검색 상세가 함께 쓰는 관심상품(하트) 토글 */
export function useInterestToggle() {
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const member = useMeQuery();
    const mutation = useToggleInterestMutation();
    const [loginNoticeOpen, setLoginNoticeOpen] = useState(false);
    // 같은 상품의 요청이 끝나기 전 다시 누르면 무시한다.
    const pendingTargets = useRef(new Set<string>());
    const memberError = isLoggedIn ? member.error : null;
    const memberLoading = !isInitialized || (isLoggedIn && member.isPending);

    return {
        disabled: memberLoading || Boolean(memberError),
        loginNoticeOpen: !isLoggedIn && loginNoticeOpen,
        onLoginNoticeOpenChange: setLoginNoticeOpen,
        errorMessage: memberError
            ? getApiErrorMessage(memberError)
            : mutation.error
              ? getApiErrorMessage(mutation.error)
              : null,
        canRetry: Boolean(memberError),
        retry: () => void member.refetch(),
        /**
         * onAdd는 새로 등록할 때 하트 변경과 함께 바로 호출되고(해제 시 호출 안 함),
         * 그 등록이 서버에서 실패하면 onAddFailed가 호출된다(캐시는 mutation이 되돌린다).
         */
        toggle: (target: InterestTarget, options: InterestToggleOptions) => {
            if (!isLoggedIn) {
                setLoginNoticeOpen(true);
                return;
            }
            const key = targetKey(target);
            if (memberLoading || memberError || pendingTargets.current.has(key)) return;
            const interestId = options.interestId ?? undefined;
            const isAdding = interestId === undefined;
            pendingTargets.current.add(key);
            if (isAdding) options?.onAdd?.();
            // mutate의 호출별 콜백은 연속 호출 시 마지막 호출에만 실행되므로 호출마다 끝나는 Promise로 해제한다.
            // 실패는 mutation.error와 캐시 롤백으로 처리하므로 여기서는 삼킨다.
            void mutation
                .mutateAsync({ ...target, interestId })
                .catch(() => {
                    if (isAdding) options?.onAddFailed?.();
                })
                .finally(() => pendingTargets.current.delete(key));
        },
    };
}
