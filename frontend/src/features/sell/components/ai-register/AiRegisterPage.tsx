"use client";

import { useEffect, useReducer, useRef, useState } from "react";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Alert, AlertDescription } from "@/common/components/ui/Alert";
import { Button } from "@/common/components/ui/Button";
import { getApiErrorMessage } from "@/common/lib/api/error";
import {
    AiRegisterAdditionalInfoStep,
    type AiTradeMethod,
} from "@/features/sell/components/ai-register/AiRegisterAdditionalInfoStep";
import type { AiImagePreview } from "@/features/sell/components/ai-register/AiImageUpload";
import type { DirectDeliveryType } from "@/features/sell/components/direct-register/types";
import { ProductRegistrationProcessing } from "@/features/sell/components/ProductRegistrationProcessing";
import { RegistrationStepper } from "@/features/sell/components/shared/RegistrationStepper";
import { SellAlertDialog } from "@/features/sell/components/shared/SellAlertDialog";
import { AiRegisterUploadStep } from "@/features/sell/components/ai-register/AiRegisterUploadStep";
import { useCreateAiProductMutation } from "@/features/sell/hooks/mutations/useCreateAiProductMutation";
import {
    includedStatusApiValues,
    type IncludedStatus,
} from "@/features/sell/components/shared/IncludedStatusField";
import type { ProductCondition, ProductRegisterProgress } from "@/features/sell/types";

type AiRegisterStep = "upload" | "additional-info";

type AiRegisterState = {
    step: AiRegisterStep;
    images: AiImagePreview[];
    productCondition: ProductCondition | null;
    includedStatus: IncludedStatus | null;
    tradeMethod: AiTradeMethod | null;
    deliveryType: DirectDeliveryType;
    deliveryFee: string;
    tradeLocation: string;
};

type AiRegisterAction =
    | { type: "set-step"; step: AiRegisterStep }
    | { type: "set-images"; images: AiImagePreview[] }
    | { type: "set-product-condition"; value: ProductCondition }
    | { type: "set-included-status"; value: IncludedStatus }
    | { type: "set-trade-method"; value: AiTradeMethod }
    | { type: "set-delivery-type"; value: DirectDeliveryType }
    | { type: "set-delivery-fee"; value: string }
    | { type: "set-trade-location"; value: string };

type AiAdditionalInfoErrors = {
    productCondition: string;
    includedStatus: string;
    tradeMethod: string;
    deliveryType: string;
    deliveryFee: string;
    tradeLocation: string;
};

const initialAdditionalInfoErrors: AiAdditionalInfoErrors = {
    productCondition: "",
    includedStatus: "",
    tradeMethod: "",
    deliveryType: "",
    deliveryFee: "",
    tradeLocation: "",
};

const initialState: AiRegisterState = {
    step: "upload",
    images: [],
    productCondition: null,
    includedStatus: null,
    tradeMethod: null,
    deliveryType: null,
    deliveryFee: "",
    tradeLocation: "",
};

function aiRegisterReducer(state: AiRegisterState, action: AiRegisterAction): AiRegisterState {
    switch (action.type) {
        case "set-step":
            return { ...state, step: action.step };
        case "set-images":
            return { ...state, images: action.images };
        case "set-product-condition":
            return { ...state, productCondition: action.value };
        case "set-included-status":
            return { ...state, includedStatus: action.value };
        case "set-trade-method":
            return { ...state, tradeMethod: action.value };
        case "set-delivery-type":
            return { ...state, deliveryType: action.value };
        case "set-delivery-fee":
            return { ...state, deliveryFee: action.value };
        case "set-trade-location":
            return { ...state, tradeLocation: action.value };
    }
}

export function AiRegisterPage() {
    const router = useRouter();
    const [state, dispatch] = useReducer(aiRegisterReducer, initialState);
    const [error, setError] = useState("");
    const [additionalInfoErrors, setAdditionalInfoErrors] = useState<AiAdditionalInfoErrors>(
        initialAdditionalInfoErrors,
    );
    const [submissionStatus, setSubmissionStatus] = useState<
        "idle" | "loading" | "success" | "error"
    >("idle");
    const [submissionError, setSubmissionError] = useState("");
    const [submissionErrorCode, setSubmissionErrorCode] = useState<string | null>(null);
    const [submissionProgress, setSubmissionProgress] = useState<ProductRegisterProgress | null>(
        null,
    );
    const [createdProductId, setCreatedProductId] = useState<number | null>(null);
    const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
    const imagesRef = useRef(state.images);
    const createAiProductMutation = useCreateAiProductMutation({
        onSuccess: (product) => {
            setCreatedProductId(product.id);
            setSubmissionStatus("success");
        },
        onProgress: setSubmissionProgress,
        onError: (mutationError) => {
            setSubmissionError(getApiErrorMessage(mutationError));
            setSubmissionErrorCode(mutationError.code ?? null);
            setSubmissionStatus("error");
        },
    });

    const handleGoToManage = () => {
        if (createdProductId === null) {
            router.push("/sell/manage");
            return;
        }

        router.push(`/sell/manage/${createdProductId}?method=ai`);
    };

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

    const handleCreate = () => {
        const { productCondition, includedStatus, tradeMethod, deliveryType, deliveryFee } = state;
        const parsedDeliveryFee = deliveryFee ? Number(deliveryFee) : null;
        const nextErrors: AiAdditionalInfoErrors = {
            productCondition: productCondition ? "" : "상품 상태를 선택해 주세요.",
            includedStatus: includedStatus ? "" : "구성품을 선택해 주세요.",
            tradeMethod: tradeMethod ? "" : "거래 방식을 선택해 주세요.",
            deliveryType:
                tradeMethod === "delivery" && !deliveryType
                    ? "배송비 부담 방식을 선택해 주세요."
                    : "",
            deliveryFee:
                tradeMethod === "delivery" && deliveryType === "PREPAID"
                    ? parsedDeliveryFee === null
                        ? "배송비를 입력해 주세요."
                        : parsedDeliveryFee < 2700 || parsedDeliveryFee > 17000
                          ? "배송비는 2,700원 이상 17,000원 이하로 입력해 주세요."
                          : ""
                    : "",
            tradeLocation:
                tradeMethod === "direct" && !state.tradeLocation.trim()
                    ? "거래 희망 지역을 선택해 주세요."
                    : "",
        };

        setAdditionalInfoErrors(nextErrors);

        if (
            Object.values(nextErrors).some(Boolean) ||
            productCondition === null ||
            includedStatus === null ||
            tradeMethod === null
        ) {
            return;
        }

        setSubmissionError("");
        setSubmissionErrorCode(null);
        setSubmissionProgress(null);
        setSubmissionStatus("loading");

        createAiProductMutation.mutate({
            images: state.images.map((image) => image.file),
            condition: productCondition,
            includedStatus: includedStatusApiValues[includedStatus],
            tradeMethod: tradeMethod === "direct" ? "DIRECT" : "DELIVERY",
            deliveryType: tradeMethod === "delivery" ? deliveryType : null,
            deliveryFee:
                tradeMethod === "delivery" && deliveryType === "PREPAID" ? parsedDeliveryFee : null,
            preferredTradeRegion: tradeMethod === "direct" ? state.tradeLocation : null,
        });
    };

    if (submissionStatus !== "idle") {
        return (
            <ProductRegistrationProcessing
                kind="ai"
                status={submissionStatus}
                errorMessage={submissionError}
                errorCode={submissionErrorCode}
                progress={submissionProgress}
                onRetry={handleCreate}
                onGoToManage={handleGoToManage}
            />
        );
    }

    const isUploadStep = state.step === "upload";
    const stepActions = (
        <div className="relative flex w-full justify-end gap-3 pt-[60px]">
            {error && isUploadStep && (
                <Alert
                    variant="destructive"
                    className="flex w-auto max-w-full items-center border-0 bg-transparent p-0 text-left shadow-none sm:absolute sm:top-4 sm:left-0"
                >
                    <AlertDescription className="typography-body-small text-destructive p-0 text-left">
                        {error}
                    </AlertDescription>
                </Alert>
            )}
            <div className="flex justify-end gap-2 md:gap-3">
                <Button
                    type="button"
                    className="typography-heading-03 h-12 shrink-0 rounded-full border-0 bg-[#d3d3d3] px-6 py-3 font-semibold text-white hover:bg-[#c6c6c6] md:h-[54px] md:px-[50px]"
                    onClick={() => setIsExitDialogOpen(true)}
                >
                    나가기
                </Button>
                {isUploadStep ? (
                    <Button
                        key="upload-next"
                        type="button"
                        className="typography-heading-03 h-12 min-w-0 flex-1 rounded-full bg-[#6653fb] px-5 py-3 font-semibold text-white hover:bg-[#5745e7] md:h-[54px] md:flex-none md:px-[50px]"
                        onClick={handleNextStep}
                    >
                        다음단계
                    </Button>
                ) : (
                    <Button
                        key="additional-info-create"
                        type="button"
                        className="typography-body-bold h-12 min-w-0 flex-1 rounded-full bg-[#6653fb] px-5 py-3 font-semibold text-white hover:bg-[#5745e7] md:h-[54px] md:flex-none md:px-8"
                        onClick={handleCreate}
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
                className={`layout-container flex flex-1 flex-col gap-8 py-6 md:gap-[80px] md:py-16 ${
                    isUploadStep ? "pb-10 md:pb-[120px]" : "pb-10 md:pb-[80px]"
                }`}
            >
                <header className="flex flex-col gap-5 md:gap-[30px]">
                    {!isUploadStep && (
                        <button
                            type="button"
                            className="typography-heading-03 flex w-fit items-center gap-1 font-medium text-[#6b7395] transition-colors hover:text-[#6653fb]"
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
                        <h1 className="typography-heading-01 col-start-1 row-start-1 mt-[38px] self-start font-bold text-[#6653fb] md:mt-[52px]">
                            {isUploadStep ? "상품 사진을 올려주세요" : "조금만 더 알려주세요"}
                        </h1>
                    </div>
                </header>

                <div className="flex w-full flex-col gap-8 rounded-[20px] bg-white pt-0 sm:px-8 lg:px-[60px]">
                    <RegistrationStepper
                        steps={["사진 등록", "추가 정보 입력"]}
                        currentStepIndex={isUploadStep ? 0 : 1}
                    />
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
                            productCondition={state.productCondition}
                            includedStatus={state.includedStatus}
                            tradeMethod={state.tradeMethod}
                            deliveryType={state.deliveryType}
                            deliveryFee={state.deliveryFee}
                            tradeLocation={state.tradeLocation}
                            onProductConditionChange={(value) => {
                                dispatch({ type: "set-product-condition", value });
                                setAdditionalInfoErrors((current) => ({
                                    ...current,
                                    productCondition: "",
                                }));
                            }}
                            onIncludedStatusChange={(value) => {
                                dispatch({ type: "set-included-status", value });
                                setAdditionalInfoErrors((current) => ({
                                    ...current,
                                    includedStatus: "",
                                }));
                            }}
                            onTradeMethodChange={(value) => {
                                dispatch({ type: "set-trade-method", value });
                                dispatch({
                                    type: "set-delivery-type",
                                    value: value === "direct" ? null : state.deliveryType,
                                });
                                dispatch({
                                    type: "set-delivery-fee",
                                    value: value === "direct" ? "" : state.deliveryFee,
                                });
                                dispatch({
                                    type: "set-trade-location",
                                    value: value === "delivery" ? "" : state.tradeLocation,
                                });
                                setAdditionalInfoErrors((current) => ({
                                    ...current,
                                    tradeMethod: "",
                                    deliveryType: "",
                                    deliveryFee: "",
                                    tradeLocation: "",
                                }));
                            }}
                            onDeliveryTypeChange={(value) => {
                                dispatch({ type: "set-delivery-type", value });
                                if (value === "INCLUDED") {
                                    dispatch({ type: "set-delivery-fee", value: "" });
                                }
                                setAdditionalInfoErrors((current) => ({
                                    ...current,
                                    deliveryType: "",
                                    deliveryFee: "",
                                }));
                            }}
                            onDeliveryFeeChange={(value) => {
                                dispatch({ type: "set-delivery-fee", value });
                                setAdditionalInfoErrors((current) => ({
                                    ...current,
                                    deliveryFee: "",
                                }));
                            }}
                            onTradeLocationChange={(value) => {
                                dispatch({ type: "set-trade-location", value });
                                setAdditionalInfoErrors((current) => ({
                                    ...current,
                                    tradeLocation: "",
                                }));
                            }}
                            errors={additionalInfoErrors}
                        >
                            {stepActions}
                        </AiRegisterAdditionalInfoStep>
                    )}
                </div>
            </section>

            <SellAlertDialog
                open={isExitDialogOpen}
                onClose={() => setIsExitDialogOpen(false)}
                onConfirm={handleExit}
                title="상품 등록을 나가시겠습니까?"
                description={
                    <>
                        현재 작성 중인 내용은 저장되지 않으며,
                        <br />
                        나가면 다시 복구할 수 없습니다.
                    </>
                }
                confirmLabel="나가기"
                cancelLabel="돌아가기"
                overlayClassName="!bg-[#272727]/50 !backdrop-blur-none"
            />
        </main>
    );
}
