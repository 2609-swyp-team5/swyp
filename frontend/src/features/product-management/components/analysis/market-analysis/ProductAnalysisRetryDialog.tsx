"use client";

import { Check, CheckCircle2, Circle, CircleAlert, Clock3, LoaderCircle } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/common/components/ui/Dialog";
import { Button } from "@/common/components/ui/Button";
import { getApiErrorMessage } from "@/common/lib/api/error";
import type {
    ProductAnalysisStep,
    ProductAnalysisStepStatus,
} from "../../../schemas/productAnalysisStreamSchema";
import type { ProductAnalysisRetryNotice } from "../../../hooks/useRequestProductAnalysisMutation";

const steps: Array<{ key: ProductAnalysisStep; label: string }> = [
    { key: "CANDIDATE_SEARCH", label: "비교할 매물 찾기" },
    { key: "AI_ANALYSIS", label: "AI 시세 분석" },
    { key: "PRICE_CALCULATION", label: "시세·추천 가격 계산" },
    { key: "FORECAST", label: "감가·가격 전망 계산" },
    { key: "SAVE", label: "분석 결과 저장" },
];

function StepIcon({ state }: { state: "completed" | "active" | "pending" }) {
    if (state === "completed") {
        return (
            <span className="flex size-6 items-center justify-center rounded-full bg-[#6653fb] text-white">
                <Check aria-hidden="true" className="size-4" strokeWidth={3} />
            </span>
        );
    }

    if (state === "active") {
        return (
            <span className="flex size-6 items-center justify-center rounded-full border-4 border-[#ecebff] bg-[#6653fb]">
                <span className="size-2 rounded-full bg-white" />
            </span>
        );
    }

    return <Circle aria-hidden="true" className="size-6 fill-[#e4e5ed] text-[#e4e5ed]" />;
}

function getStepState(
    stepIndex: number,
    progress: { index: number; status: ProductAnalysisStepStatus } | null,
) {
    if (!progress) {
        return stepIndex === 0 ? "active" : "pending";
    }

    if (
        stepIndex < progress.index - 1 ||
        (stepIndex === progress.index - 1 && progress.status === "DONE")
    ) {
        return "completed";
    }

    if (stepIndex === progress.index - 1) {
        return "active";
    }

    return "pending";
}

export function ProductAnalysisRetryDialog({
    open,
    progress,
    notice,
    error,
    onClose,
    onClosed,
    onRetry,
}: {
    open: boolean;
    progress: {
        step: ProductAnalysisStep;
        status: ProductAnalysisStepStatus;
        index: number;
        total: number;
        message: string;
    } | null;
    notice: ProductAnalysisRetryNotice | null;
    error?: unknown;
    onClose: () => void;
    onClosed: () => void;
    onRetry: () => void;
}) {
    const isProcessing = !error && !notice;
    const isCloseBlocked = isProcessing || Boolean(notice);
    const title = error
        ? "시세 분석을 완료하지 못했어요"
        : notice?.kind === "completed"
          ? "시세 분석이 완료됐어요"
          : notice?.status === "ANALYZING"
            ? "시세 분석이 아직 진행 중이에요"
            : notice?.status === "ANALYZED"
              ? "시세 분석 결과가 최신 상태예요"
              : notice
                ? "시세 분석을 다시 시작하지 않았어요"
                : "시세 분석을 다시 하고 있어요";
    const description = error
        ? getApiErrorMessage(error)
        : (notice?.message ?? progress?.message ?? "분석을 준비하고 있어요.");

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen && !isCloseBlocked) {
                    onClose();
                }
            }}
        >
            <DialogContent
                aria-describedby="product-analysis-retry-description"
                className="w-[min(calc(100vw-32px),422px)] max-w-none gap-[35px] rounded-[16px] border-[#dee5ed] bg-white p-[33px] shadow-[0_8px_24px_rgba(54,51,100,0.18)]"
                onAnimationEnd={(event) => {
                    if (!open && event.currentTarget === event.target) {
                        onClosed();
                    }
                }}
                onEscapeKeyDown={(event) => {
                    if (isCloseBlocked) {
                        event.preventDefault();
                    }
                }}
                onPointerDownOutside={(event) => {
                    if (isCloseBlocked) {
                        event.preventDefault();
                    }
                }}
            >
                <div className="flex flex-col items-center text-center">
                    {isProcessing ? (
                        <LoaderCircle
                            aria-hidden="true"
                            className="mb-5 size-12 animate-spin text-[#6653fb]"
                        />
                    ) : error ? (
                        <CircleAlert aria-hidden="true" className="mb-5 size-12 text-[#6653fb]" />
                    ) : notice?.kind === "completed" ? (
                        <CheckCircle2 aria-hidden="true" className="mb-5 size-12 text-[#6653fb]" />
                    ) : notice?.status === "ANALYZING" || notice?.status === "ANALYZED" ? (
                        <Clock3 aria-hidden="true" className="mb-5 size-12 text-[#6653fb]" />
                    ) : notice ? (
                        <CircleAlert aria-hidden="true" className="mb-5 size-12 text-[#6653fb]" />
                    ) : null}
                    <DialogTitle className="text-[22px] leading-[30px] font-bold text-[#6653fb]">
                        {title}
                    </DialogTitle>
                    <DialogDescription
                        id="product-analysis-retry-description"
                        aria-live="polite"
                        className="pt-2 text-[14px] leading-[21px] text-[#6b7395]"
                    >
                        {description}
                    </DialogDescription>
                </div>

                {isProcessing ? (
                    <div className="rounded-[10px] border border-[#dee5ed] bg-[#fafbff] px-5 py-4">
                        <ol className="flex flex-col gap-4" aria-label="시세 분석 진행 단계">
                            {steps.map((step, index) => {
                                const state = getStepState(index, progress);
                                return (
                                    <li
                                        key={step.key}
                                        className={
                                            state === "pending"
                                                ? "flex items-center gap-3 text-[14px] leading-[21px] text-[#c9cad4]"
                                                : "flex items-center gap-3 text-[14px] leading-[21px] font-semibold text-[#464646]"
                                        }
                                    >
                                        <StepIcon state={state} />
                                        <span>{step.label}</span>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                ) : null}

                {error ? (
                    <div className="flex justify-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-11 flex-1 rounded-full border-[#6653fb] text-[#6653fb]"
                            onClick={onClose}
                        >
                            닫기
                        </Button>
                        <Button
                            type="button"
                            className="h-11 flex-1 rounded-full bg-[#6653fb] text-white hover:bg-[#5745e7]"
                            onClick={onRetry}
                        >
                            다시 시도
                        </Button>
                    </div>
                ) : notice ? (
                    <Button
                        type="button"
                        className="h-11 w-full rounded-full bg-[#6653fb] text-white hover:bg-[#5745e7]"
                        onClick={onClose}
                    >
                        {notice.kind === "completed" ? "닫기" : "확인"}
                    </Button>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
