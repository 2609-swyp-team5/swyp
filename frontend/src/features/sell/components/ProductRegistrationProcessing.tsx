"use client";

import { Button } from "@/common/components/ui/Button";
import type { ProductRegisterProgress } from "@/features/sell/types";

type RegistrationProcessingKind = "ai" | "direct" | "edit";
type RegistrationProcessingStatus = "loading" | "success" | "error";

type ProductRegistrationProcessingProps = {
    kind: RegistrationProcessingKind;
    status: RegistrationProcessingStatus;
    errorMessage?: string;
    errorCode?: string | null;
    progress?: ProductRegisterProgress | null;
    progressHistory?: ProductRegisterProgress[];
    onGoToManage: () => void;
    onRetry?: () => void;
};

type ProcessingStepProps = {
    label: string;
    state: "done" | "active" | "pending" | "error" | "skipped";
};

const ensureSentencePeriod = (message: string) => (message.endsWith(".") ? message : `${message}.`);

function ProcessingStep({ label, state }: ProcessingStepProps) {
    const isDone = state === "done";
    const isActive = state === "active";
    const isError = state === "error";
    const isSkipped = state === "skipped";

    return (
        <div className="flex w-full items-center gap-3">
            <div
                aria-hidden="true"
                className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                    isDone
                        ? "bg-[#6653fb] text-[11px] text-white"
                        : isError
                          ? "bg-[#fa503d] text-[11px] font-bold text-white"
                          : isSkipped
                            ? "bg-[#a6a6b5] text-[13px] font-bold text-white"
                            : isActive
                              ? "bg-white"
                              : "bg-[#dedee6]"
                }`}
            >
                {isDone ? (
                    "✓"
                ) : isError ? (
                    "!"
                ) : isSkipped ? (
                    "−"
                ) : isActive ? (
                    <span className="size-2 rounded-full bg-[#6653fb]" />
                ) : null}
            </div>
            <p
                className={`text-[16px] leading-[25px] font-semibold tracking-[0.5px] ${
                    isDone
                        ? "text-[#363636]"
                        : isError
                          ? "text-[#fa503d]"
                          : isSkipped
                            ? "text-[#6b6c7b]"
                            : isActive
                              ? "text-[#363636]"
                              : "text-[#dedee6]"
                }`}
            >
                {label}
            </p>
        </div>
    );
}

const registerStepDefinitions = [
    {
        step: "IMAGE_UPLOAD",
        label: "이미지 업로드",
        startMessage: "이미지 업로드하는 중",
        doneMessage: "이미지 업로드 완료",
    },
    {
        step: "IMAGE_ANALYSIS",
        label: "상품 이미지 분석",
        startMessage: "상품 이미지 분석하는 중",
        doneMessage: "상품 이미지 분석 완료",
    },
    {
        step: "PRODUCT_SAVE",
        label: "상품 등록",
        startMessage: "상품 등록하는 중",
        doneMessage: "상품 등록 완료",
    },
] as const;

function getRegisterStepState(
    index: number,
    progress: ProductRegisterProgress | null | undefined,
    status: RegistrationProcessingStatus,
    isTimeout: boolean,
): ProcessingStepProps["state"] {
    if (status === "success") {
        return "done";
    }

    if (status === "error") {
        if (isTimeout) {
            if (!progress) {
                return index === 0 ? "active" : "pending";
            }

            if (index < progress.index - 1) {
                return "done";
            }

            return index === progress.index - 1 ? "active" : "pending";
        }

        if (!progress) {
            return "pending";
        }

        if (index < progress.index - 1) {
            return "done";
        }

        if (index === progress.index - 1) {
            return "error";
        }

        return "pending";
    }

    if (!progress) {
        return index === 0 ? "active" : "pending";
    }

    if (index < progress.index - 1) {
        return "done";
    }

    if (index > progress.index - 1) {
        return "pending";
    }

    return progress.status === "START" ? "active" : "done";
}

function LoadingSteps({
    kind,
    status,
    progress,
    progressHistory,
    errorCode,
}: {
    kind: RegistrationProcessingKind;
    status: RegistrationProcessingStatus;
    progress?: ProductRegisterProgress | null;
    progressHistory?: ProductRegisterProgress[];
    errorCode?: string | null;
}) {
    const isTimeout = errorCode === "REGISTER_TIMEOUT";

    return (
        <div className="flex flex-col gap-3">
            {registerStepDefinitions.map((definition, index) => {
                const state = getRegisterStepState(index, progress, status, isTimeout);
                const isCurrentStep = progress?.step === definition.step;
                const stepProgress = progressHistory?.findLast(
                    (item) => item.step === definition.step,
                );
                const baseLabel =
                    kind === "edit" && definition.step === "PRODUCT_SAVE"
                        ? "상품 수정"
                        : definition.label;
                const startMessage =
                    kind === "edit" && definition.step === "PRODUCT_SAVE"
                        ? "상품 수정하는 중"
                        : definition.startMessage;
                const doneMessage =
                    kind === "edit" && definition.step === "PRODUCT_SAVE"
                        ? "상품 수정 완료"
                        : definition.doneMessage;
                const isSkipped =
                    kind === "edit" &&
                    (stepProgress?.status ?? (isCurrentStep ? progress?.status : undefined)) ===
                        "SKIP";
                const label =
                    state === "error"
                        ? `${baseLabel} 실패`
                        : isSkipped
                          ? `${baseLabel} 건너뜀`
                          : isCurrentStep
                            ? isTimeout
                                ? startMessage
                                : progress.message
                            : state === "done"
                              ? doneMessage
                              : state === "active"
                                ? startMessage
                                : baseLabel;

                return (
                    <ProcessingStep
                        key={definition.step}
                        label={label}
                        state={isSkipped ? "skipped" : state}
                    />
                );
            })}
        </div>
    );
}

function ResultContent({
    status,
    kind,
    progress,
    errorMessage,
    errorCode,
}: Pick<
    ProductRegistrationProcessingProps,
    "status" | "kind" | "progress" | "errorMessage" | "errorCode"
>) {
    if (status === "loading") {
        return (
            <>
                <div
                    aria-hidden="true"
                    className="size-[72px] animate-spin rounded-full border-4 border-[#dedee6] border-t-[#6653fb]"
                />
                <div className="flex flex-col gap-2 text-center">
                    <h1 className="text-[60px] leading-[75px] font-bold tracking-[0.5px] text-[#6653fb]">
                        {kind === "edit"
                            ? "상품을 수정하고 있어요"
                            : kind === "ai"
                              ? "판매 글을 만들고 있어요"
                              : "상품을 등록하고 있어요"}
                    </h1>
                    <p className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#363636]">
                        {progress?.message
                            ? `${progress.message}`
                            : kind === "edit"
                              ? "잠시만 기다려 주세요 수정한 상품을 저장 중이에요"
                              : kind === "ai"
                                ? "잠시만 기다려 주세요 AI가 열심히 분석 중이에요"
                                : "잠시만 기다려 주세요 상품 정보를 저장 중이에요"}
                    </p>
                </div>
            </>
        );
    }

    const isEdit = kind === "edit";
    const isSuccess = status === "success";
    const isTimeout = errorCode === "REGISTER_TIMEOUT";

    return (
        <div className="flex flex-col gap-2 text-center">
            <h1
                className={`text-[60px] leading-[75px] font-bold tracking-[0.5px] ${
                    isSuccess || isTimeout ? "text-[#6653fb]" : "text-[#fa503d]"
                }`}
            >
                {isSuccess
                    ? isEdit
                        ? "상품 수정이 완료되었어요"
                        : "판매 글이 등록되었어요"
                    : isTimeout
                      ? isEdit
                          ? "상품 수정이 조금 늦어지고 있어요"
                          : "상품 등록이 조금 늦어지고 있어요"
                      : isEdit
                        ? "상품 수정에 실패했어요"
                        : "판매 글 등록에 실패했어요"}
            </h1>
            <p className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#363636]">
                {isSuccess
                    ? isEdit
                        ? "변경된 항목만 반영했어요. 확인하러 가기를 눌러 판매 글을 확인해 보세요."
                        : "확인하러 가기 버튼을 눌러 등록된 판매 글을 확인해 보세요."
                    : isTimeout
                      ? isEdit
                          ? "백그라운드에서 계속 처리 중이에요. 잠시 후 상품 관리 화면에서 결과를 확인해 주세요."
                          : "백그라운드에서 계속 처리 중이에요. 잠시 후 상품 목록에서 결과를 확인해 주세요."
                      : errorMessage
                        ? "다시 시도하거나 나가기를 선택해 주세요."
                        : "잠시 후 다시 시도하거나 나가기를 선택해 주세요."}
            </p>
        </div>
    );
}

export function ProductRegistrationProcessing({
    kind,
    status,
    errorMessage,
    errorCode,
    progress,
    progressHistory,
    onGoToManage,
    onRetry,
}: ProductRegistrationProcessingProps) {
    return (
        <main className="flex flex-1 flex-col bg-white" aria-live="polite">
            <section className="flex flex-1 flex-col items-center justify-center gap-12 px-6 py-20">
                <ResultContent
                    status={status}
                    kind={kind}
                    progress={progress}
                    errorMessage={errorMessage}
                    errorCode={errorCode}
                />

                <div className="flex w-full max-w-[500px] flex-col gap-5 rounded-xl border border-[#dee5ed] bg-gradient-to-b from-[#ededfd] to-white p-6">
                    <LoadingSteps
                        kind={kind}
                        status={status}
                        progress={progress}
                        progressHistory={progressHistory}
                        errorCode={errorCode}
                    />
                </div>

                {status === "error" ? (
                    <p
                        role="alert"
                        className={`w-full max-w-[500px] rounded-xl border px-5 py-4 text-center text-[14px] leading-[22px] font-semibold ${
                            errorCode === "REGISTER_TIMEOUT"
                                ? "border-[#6653fb] bg-[#f5f3ff] text-[#6653fb]"
                                : "border-[#fa503d] bg-[#fff4f4] text-[#fa503d]"
                        }`}
                    >
                        {ensureSentencePeriod(errorMessage ?? "잠시 후 다시 시도해 주세요")}
                    </p>
                ) : null}

                {status === "success" ? (
                    <Button
                        type="button"
                        className="h-[54px] rounded-full bg-[#6653fb] px-10 py-3 text-[18px] leading-[28px] font-semibold text-white hover:bg-[#5745e7]"
                        onClick={onGoToManage}
                    >
                        확인하러 가기
                    </Button>
                ) : null}

                {status === "error" ? (
                    <div className="flex items-center gap-3">
                        {errorCode !== "REGISTER_TIMEOUT" ? (
                            <Button
                                type="button"
                                className="h-[54px] rounded-full bg-[#6653fb] px-10 py-3 text-[18px] leading-[28px] font-semibold text-white hover:bg-[#5745e7]"
                                onClick={onRetry}
                            >
                                다시 시도
                            </Button>
                        ) : null}
                        <Button
                            type="button"
                            className="h-[54px] rounded-full bg-[#d3d3d3] px-10 py-3 text-[18px] leading-[28px] font-semibold text-white hover:bg-[#c6c6c6]"
                            onClick={onGoToManage}
                        >
                            {errorCode === "REGISTER_TIMEOUT"
                                ? kind === "edit"
                                    ? "상품 확인"
                                    : "상품 목록 확인"
                                : "나가기"}
                        </Button>
                    </div>
                ) : null}
            </section>
        </main>
    );
}
