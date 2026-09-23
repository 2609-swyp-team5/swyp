"use client";

import { Button } from "@/common/components/ui/Button";

type RegistrationProcessingKind = "ai" | "direct";
type RegistrationProcessingStatus = "loading" | "success" | "error";

type ProductRegistrationProcessingProps = {
    kind: RegistrationProcessingKind;
    status: RegistrationProcessingStatus;
    errorMessage?: string;
    onGoToManage: () => void;
    onRetry?: () => void;
};

type ProcessingStepProps = {
    label: string;
    state: "done" | "active" | "pending";
};

function ProcessingStep({ label, state }: ProcessingStepProps) {
    const isDone = state === "done";
    const isActive = state === "active";

    return (
        <div className="flex w-full items-center gap-3">
            <div
                aria-hidden="true"
                className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                    isDone
                        ? "bg-[#6653fb] text-[11px] text-white"
                        : isActive
                          ? "bg-white"
                          : "bg-[#dedee6]"
                }`}
            >
                {isDone ? (
                    "✓"
                ) : isActive ? (
                    <span className="size-2 rounded-full bg-[#6653fb]" />
                ) : null}
            </div>
            <p
                className={`text-[16px] leading-[25px] font-semibold tracking-[0.5px] ${
                    isDone
                        ? "text-[#363636]"
                        : isActive
                          ? "bg-gradient-to-b from-[#6653fb] to-[#b1a9ef] bg-clip-text text-transparent"
                          : "text-[#dedee6]"
                }`}
            >
                {label}
            </p>
        </div>
    );
}

function LoadingSteps({ kind }: { kind: RegistrationProcessingKind }) {
    if (kind === "direct") {
        return (
            <div className="flex flex-col gap-3">
                <ProcessingStep label="상품 정보 저장 중" state="active" />
                <ProcessingStep label="상품 등록 완료" state="pending" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <ProcessingStep label="상품과 브랜드 확인" state="done" />
            <ProcessingStep label="사진 속 사용 흔적 분석" state="done" />
            <ProcessingStep label="유사 상품 가격 비교 중" state="active" />
            <ProcessingStep label="플랫폼별 판매 글 작성 중" state="pending" />
        </div>
    );
}

function ResultContent({
    status,
    kind,
    errorMessage,
}: Pick<ProductRegistrationProcessingProps, "status" | "kind" | "errorMessage">) {
    if (status === "success") {
        return (
            <>
                <div className="flex size-[72px] items-center justify-center rounded-full bg-[#6653fb] text-[36px] text-white">
                    ✓
                </div>
                <div className="flex flex-col gap-2 text-center">
                    <h1 className="text-[48px] leading-[60px] font-bold tracking-[0.5px] text-[#6653fb]">
                        {kind === "ai" ? "판매 글을 만들었어요" : "상품을 등록했어요"}
                    </h1>
                    <p className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#363636]">
                        등록한 상품을 확인해 보세요.
                    </p>
                </div>
            </>
        );
    }

    if (status === "error") {
        return (
            <>
                <div className="flex size-[72px] items-center justify-center rounded-full bg-[#dedee6] text-[34px] font-bold text-[#6653fb]">
                    !
                </div>
                <div className="flex flex-col gap-2 text-center">
                    <h1 className="text-[48px] leading-[60px] font-bold tracking-[0.5px] text-[#6653fb]">
                        등록에 실패했어요
                    </h1>
                    <p className="max-w-[560px] text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#6b6c7b]">
                        {errorMessage ?? "잠시 후 다시 시도해 주세요."}
                    </p>
                </div>
            </>
        );
    }

    return (
        <>
            <div
                aria-hidden="true"
                className="size-[72px] animate-spin rounded-full border-4 border-[#dedee6] border-t-[#6653fb]"
            />
            <div className="flex flex-col gap-2 text-center">
                <h1 className="text-[60px] leading-[75px] font-bold tracking-[0.5px] text-[#6653fb]">
                    {kind === "ai" ? "판매 글을 만들고 있어요" : "상품을 등록하고 있어요"}
                </h1>
                <p className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#363636]">
                    {kind === "ai"
                        ? "잠시만 기다려 주세요. AI가 열심히 분석 중이에요."
                        : "잠시만 기다려 주세요. 상품 정보를 저장 중이에요."}
                </p>
            </div>
        </>
    );
}

export function ProductRegistrationProcessing({
    kind,
    status,
    errorMessage,
    onGoToManage,
    onRetry,
}: ProductRegistrationProcessingProps) {
    const isLoading = status === "loading";

    return (
        <main className="flex flex-1 flex-col bg-white" aria-live="polite">
            <section className="flex flex-1 flex-col items-center justify-center gap-12 px-6 py-20">
                <ResultContent status={status} kind={kind} errorMessage={errorMessage} />

                {isLoading ? (
                    <div className="flex w-full max-w-[500px] flex-col gap-5 rounded-xl border border-[#dee5ed] bg-gradient-to-b from-[#ededfd] to-white p-6">
                        <LoadingSteps kind={kind} />
                    </div>
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
                        <Button
                            type="button"
                            className="h-[54px] rounded-full bg-[#6653fb] px-10 py-3 text-[18px] leading-[28px] font-semibold text-white hover:bg-[#5745e7]"
                            onClick={onRetry}
                        >
                            다시 시도
                        </Button>
                        <Button
                            type="button"
                            className="h-[54px] rounded-full bg-[#d3d3d3] px-10 py-3 text-[18px] leading-[28px] font-semibold text-white hover:bg-[#c6c6c6]"
                            onClick={onGoToManage}
                        >
                            나가기
                        </Button>
                    </div>
                ) : null}
            </section>
        </main>
    );
}
