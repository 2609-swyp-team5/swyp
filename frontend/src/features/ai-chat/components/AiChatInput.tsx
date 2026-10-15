"use client";

import { SendHorizontal, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

const maxLength = 500;

/** 대화 아래 질문 입력창 — 질문 수정을 고르면 그 질문이 채워지고 바로 입력할 수 있게 초점을 옮긴다. */
export function AiChatInput({
    value,
    onChange,
    onSubmit,
    disabled,
}: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    disabled: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (value) {
            inputRef.current?.focus();
        }
    }, [value]);

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
            }}
            className="sticky bottom-[calc(var(--mobile-tab-bar-height)+12px+env(safe-area-inset-bottom))] flex items-center justify-between gap-3 rounded-[10px] border border-[#d3d3d3] bg-white px-4 py-3 shadow-[0_4px_16px_rgba(54,51,100,0.08)] md:bottom-5 md:gap-5 md:px-[30px] md:py-[15px]"
        >
            <span className="flex min-w-0 flex-1 items-center gap-3 md:gap-5">
                <Sparkles aria-hidden="true" className="size-5 shrink-0 text-[#6653fb]" />
                <input
                    ref={inputRef}
                    value={value}
                    maxLength={maxLength}
                    aria-label="AI에게 질문하기"
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="무엇이든 물어보세요"
                    className="typography-body-medium min-w-0 flex-1 text-[#363636] outline-none placeholder:text-[#a9adbd]"
                />
            </span>
            <button
                type="submit"
                aria-label="보내기"
                disabled={disabled || !value.trim()}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#6653fb] text-white transition-opacity disabled:opacity-40"
            >
                <SendHorizontal aria-hidden="true" className="size-5" />
            </button>
        </form>
    );
}
