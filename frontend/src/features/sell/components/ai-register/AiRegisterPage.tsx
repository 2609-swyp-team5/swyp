"use client";

import { useEffect, useReducer, useRef, useState } from "react";

import { useRouter } from "next/navigation";
import { ArrowLeft, CircleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/common/components/ui/Alert";
import { Button } from "@/common/components/ui/Button";
import {
    AiRegisterAdditionalInfoStep,
    type AiIncludedItem,
    type AiOperationStatus,
    type AiPurchasePeriod,
} from "@/features/sell/components/ai-register/AiRegisterAdditionalInfoStep";
import type { AiImagePreview } from "@/features/sell/components/ai-register/AiImageUpload";
import { ExitDialog } from "@/features/sell/components/shared/ExitDialog";
import { AiRegisterUploadStep } from "@/features/sell/components/ai-register/AiRegisterUploadStep";

type AiRegisterStep = "upload" | "additional-info";

type AiRegisterState = {
    step: AiRegisterStep;
    images: AiImagePreview[];
    purchasePeriod: AiPurchasePeriod;
    operationStatus: AiOperationStatus;
    includedItems: AiIncludedItem[];
};

type AiRegisterAction =
    | { type: "set-step"; step: AiRegisterStep }
    | { type: "set-images"; images: AiImagePreview[] }
    | { type: "set-purchase-period"; value: AiPurchasePeriod }
    | { type: "set-operation-status"; value: AiOperationStatus }
    | { type: "set-included-item"; value: AiIncludedItem; checked: boolean };

const initialState: AiRegisterState = {
    step: "upload",
    images: [],
    purchasePeriod: "6",
    operationStatus: "normal",
    includedItems: ["body", "charging-cable"],
};

function aiRegisterReducer(state: AiRegisterState, action: AiRegisterAction): AiRegisterState {
    switch (action.type) {
        case "set-step":
            return { ...state, step: action.step };
        case "set-images":
            return { ...state, images: action.images };
        case "set-purchase-period":
            return { ...state, purchasePeriod: action.value };
        case "set-operation-status":
            return { ...state, operationStatus: action.value };
        case "set-included-item":
            return {
                ...state,
                includedItems: action.checked
                    ? state.includedItems.includes(action.value)
                        ? state.includedItems
                        : [...state.includedItems, action.value]
                    : state.includedItems.filter((item) => item !== action.value),
            };
    }
}

export function AiRegisterPage() {
    const router = useRouter();
    const [state, dispatch] = useReducer(aiRegisterReducer, initialState);
    const [error, setError] = useState("");
    const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
    const imagesRef = useRef(state.images);

    useEffect(() => {
        imagesRef.current = state.images;
    }, [state.images]);

    useEffect(() => {
        return () => {
            imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
        };
    }, []);

    const handleNextStep = () => {
        if (state.images.length === 0) {
            setError("상품 사진을 1장 이상 업로드해주세요.");
            return;
        }

        setError("");
        dispatch({ type: "set-step", step: "additional-info" });
    };

    const handlePreviousStep = () => {
        dispatch({ type: "set-step", step: "upload" });
    };

    const handleExit = () => {
        setIsExitDialogOpen(false);
        router.push("/sell/register");
    };

    const isUploadStep = state.step === "upload";
    const stepActions = (
        <div className="relative flex w-full justify-end gap-3 pt-[60px]">
            {error && isUploadStep && (
                <Alert
                    variant="destructive"
                    className="flex w-auto max-w-full items-center gap-2 border-0 bg-transparent p-0 text-left shadow-none sm:absolute sm:top-4 sm:left-0"
                >
                    <span className="flex size-4 shrink-0 items-center justify-center">
                        <CircleAlert aria-hidden="true" className="size-4" />
                    </span>
                    <AlertDescription className="typography-body-small text-destructive p-0 text-left">
                        {error}
                    </AlertDescription>
                </Alert>
            )}
            <div className="flex justify-end gap-3">
                <Button
                    type="button"
                    className="h-[54px] rounded-full border-0 bg-[#d3d3d3] px-[50px] py-3 text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-white hover:bg-[#c6c6c6]"
                    onClick={() => setIsExitDialogOpen(true)}
                >
                    나가기
                </Button>
                {isUploadStep ? (
                    <Button
                        key="upload-next"
                        type="button"
                        className="h-[54px] rounded-full bg-[#6653fb] px-[50px] py-3 text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-white hover:bg-[#5745e7]"
                        onClick={handleNextStep}
                    >
                        다음단계
                    </Button>
                ) : (
                    <Button
                        key="additional-info-create"
                        type="button"
                        className="h-[54px] rounded-full bg-[#6653fb] px-8 py-3 text-[16px] leading-6 font-semibold text-white hover:bg-[#5745e7]"
                    >
                        ✦ AI 판매 글 만들기
                    </Button>
                )}
            </div>
        </div>
    );

    return (
        <main className="flex flex-1 flex-col bg-white">
            <section
                className={`layout-container flex flex-1 flex-col gap-[80px] py-16 ${
                    isUploadStep ? "pb-[120px]" : "pb-[80px]"
                }`}
            >
                <header className="flex flex-col gap-[30px]">
                    {!isUploadStep && (
                        <button
                            type="button"
                            className="flex w-fit items-center gap-1 text-[20px] leading-8 font-medium tracking-[0.5px] text-[#6b7395] transition-colors hover:text-[#6653fb]"
                            onClick={handlePreviousStep}
                        >
                            <ArrowLeft aria-hidden="true" className="size-5" />
                            <span>이전 페이지</span>
                        </button>
                    )}
                    <div className="grid grid-cols-1 grid-rows-1">
                        <p className="typography-heading-02 col-start-1 row-start-1 self-start text-[#363636]">
                            AI로 빠르게
                        </p>
                        <h1 className="col-start-1 row-start-1 mt-[52px] self-start text-[60px] leading-[75px] font-bold tracking-[0.5px] text-[#6653fb]">
                            {isUploadStep ? "상품 사진을 올려주세요" : "조금만 더 알려주세요"}
                        </h1>
                    </div>
                </header>

                <div
                    className={`flex w-full flex-col rounded-[20px] bg-white pt-0 sm:px-8 lg:px-[60px]`}
                >
                    {isUploadStep ? (
                        <AiRegisterUploadStep
                            images={state.images}
                            onError={setError}
                            onImagesChange={(images) => dispatch({ type: "set-images", images })}
                        >
                            {stepActions}
                        </AiRegisterUploadStep>
                    ) : (
                        <AiRegisterAdditionalInfoStep
                            purchasePeriod={state.purchasePeriod}
                            operationStatus={state.operationStatus}
                            includedItems={state.includedItems}
                            onPurchasePeriodChange={(value) =>
                                dispatch({ type: "set-purchase-period", value })
                            }
                            onOperationStatusChange={(value) =>
                                dispatch({ type: "set-operation-status", value })
                            }
                            onIncludedItemChange={(value, checked) =>
                                dispatch({ type: "set-included-item", value, checked })
                            }
                        >
                            {stepActions}
                        </AiRegisterAdditionalInfoStep>
                    )}
                </div>
            </section>

            <ExitDialog
                open={isExitDialogOpen}
                onClose={() => setIsExitDialogOpen(false)}
                onConfirm={handleExit}
            />
        </main>
    );
}
