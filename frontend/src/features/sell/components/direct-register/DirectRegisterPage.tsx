"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { DirectRegisterActions } from "@/features/sell/components/direct-register/DirectRegisterActions";
import { DirectRegisterInfoStep } from "@/features/sell/components/direct-register/DirectRegisterInfoStep";
import { DirectStatusPriceStep } from "@/features/sell/components/direct-register/DirectStatusPriceStep";
import type {
    DirectImagePreview,
    DirectRegisterInfoState,
    DirectStatusPriceErrors,
    DirectStatusPriceState,
} from "@/features/sell/components/direct-register/types";
import { ProductRegistrationProcessing } from "@/features/sell/components/ProductRegistrationProcessing";
import { RegistrationStepper } from "@/features/sell/components/shared/RegistrationStepper";
import { SellAlertDialog } from "@/features/sell/components/shared/SellAlertDialog";
import {
    includedStatusApiValues,
    includedStatusLabels,
    type IncludedStatus,
} from "@/features/sell/components/shared/IncludedStatusField";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useCategoriesQuery } from "@/features/sell/hooks/queries/useCategoriesQuery";
import { useCreateDirectProductMutation } from "@/features/sell/hooks/mutations/useCreateDirectProductMutation";
import type { ProductRegisterProgress } from "@/features/sell/types";

export type DirectRegisterStep = "info" | "status";

type DirectRegisterPageProps = {
    initialStep?: DirectRegisterStep;
};

const initialInfoState: DirectRegisterInfoState = {
    images: [],
    parentCategoryId: "",
    childCategoryId: "",
    subCategoryId: "",
    title: "",
    brand: "",
    description: "",
    tags: [],
    categoryOptions: [],
};

const initialStatusPriceState: DirectStatusPriceState = {
    productCondition: "B",
    purchasePeriod: "unknown",
    includedItems: [includedStatusLabels.all],
    defectStatus: "unknown",
    price: "",
    allowPriceProposal: false,
    tradeMethod: "direct",
    deliveryType: null,
    deliveryFee: "",
    tradeLocation: "",
};

const initialStatusPriceErrors: DirectStatusPriceErrors = {
    price: "",
    deliveryType: "",
    deliveryFee: "",
    tradeLocation: "",
};

export function DirectRegisterPage({ initialStep = "info" }: DirectRegisterPageProps) {
    const router = useRouter();
    const [step, setStep] = useState<DirectRegisterStep>(initialStep);
    const [info, setInfo] = useState(initialInfoState);
    const [statusPrice, setStatusPrice] = useState(initialStatusPriceState);
    const [statusPriceErrors, setStatusPriceErrors] = useState(initialStatusPriceErrors);
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
    const imagesRef = useRef<DirectImagePreview[]>(info.images);
    const {
        data: categories = [],
        isPending: isCategoriesPending,
        isError: isCategoriesError,
    } = useCategoriesQuery();
    const createDirectProductMutation = useCreateDirectProductMutation({
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

        router.push(`/sell/manage/${createdProductId}?method=direct`);
    };

    useEffect(() => {
        imagesRef.current = info.images;
    }, [info.images]);

    useEffect(() => {
        return () => {
            imagesRef.current.forEach((image) => {
                if (image.file) {
                    URL.revokeObjectURL(image.url);
                }
            });
        };
    }, []);

    const updateInfo = <K extends keyof DirectRegisterInfoState>(
        key: K,
        value: DirectRegisterInfoState[K],
    ) => {
        setInfo((current) => ({ ...current, [key]: value }));
    };

    const updateStatusPrice = <K extends keyof DirectStatusPriceState>(
        key: K,
        value: DirectStatusPriceState[K],
    ) => {
        setStatusPrice((current) => ({ ...current, [key]: value }));
    };

    const handleExit = () => {
        setIsExitDialogOpen(false);
        router.push("/sell/register");
    };

    const handleStatusPriceSubmit = () => {
        const price = Number(statusPrice.price);
        const deliveryFee = Number(statusPrice.deliveryFee);
        const nextErrors: DirectStatusPriceErrors = {
            price:
                price >= 500 && price <= 100_000_000
                    ? ""
                    : "희망 가격은 500원 이상 1억 원 이하로 입력해 주세요.",
            deliveryType:
                statusPrice.tradeMethod === "delivery" && !statusPrice.deliveryType
                    ? "배송비 부담 방식을 선택해 주세요."
                    : "",
            deliveryFee:
                statusPrice.tradeMethod === "delivery" && statusPrice.deliveryType === "PREPAID"
                    ? deliveryFee >= 2_700 && deliveryFee <= 17_000
                        ? ""
                        : "배송비는 2,700원 이상 17,000원 이하로 입력해 주세요."
                    : "",
            tradeLocation:
                statusPrice.tradeMethod === "direct" && !statusPrice.tradeLocation.trim()
                    ? "거래 희망 지역을 선택해 주세요."
                    : "",
        };

        setStatusPriceErrors(nextErrors);

        if (Object.values(nextErrors).some(Boolean)) {
            return;
        }

        setSubmissionError("");
        setSubmissionErrorCode(null);
        setSubmissionProgress(null);
        setSubmissionStatus("loading");

        createDirectProductMutation.mutate({
            images: info.images.flatMap((image) => (image.file ? [image.file] : [])),
            request: {
                categoryId: Number(
                    info.subCategoryId || info.childCategoryId || info.parentCategoryId,
                ),
                title: info.title.trim(),
                description: info.description.trim(),
                price: Number(statusPrice.price),
                condition: statusPrice.productCondition,
                includedStatus:
                    includedStatusApiValues[
                        (statusPrice.includedItems[0] === includedStatusLabels.none
                            ? "none"
                            : statusPrice.includedItems[0] === includedStatusLabels.partial
                              ? "partial"
                              : "all") as IncludedStatus
                    ],
                allowPriceSuggestion: statusPrice.allowPriceProposal,
                tradeMethod: statusPrice.tradeMethod === "direct" ? "DIRECT" : "DELIVERY",
                deliveryType: statusPrice.deliveryType,
                deliveryFee:
                    statusPrice.tradeMethod === "delivery" && statusPrice.deliveryType === "PREPAID"
                        ? Number(statusPrice.deliveryFee)
                        : null,
                preferredTradeRegion: statusPrice.tradeLocation.trim() || null,
                tags: info.tags,
                categoryOptions: info.categoryOptions,
            },
        });
    };

    if (submissionStatus !== "idle") {
        return (
            <ProductRegistrationProcessing
                kind="direct"
                status={submissionStatus}
                errorMessage={submissionError}
                errorCode={submissionErrorCode}
                progress={submissionProgress}
                onRetry={handleStatusPriceSubmit}
                onGoToManage={handleGoToManage}
            />
        );
    }

    const isInfoStep = step === "info";
    const categoryStatus = isCategoriesPending ? "loading" : isCategoriesError ? "error" : "ready";

    return (
        <main className="flex flex-1 flex-col bg-white">
            <section
                className={`layout-container flex flex-1 flex-col gap-8 pt-6 md:gap-20 md:pt-16 ${
                    isInfoStep ? "pb-10 md:pb-[120px]" : "pb-10 md:pb-[80px]"
                }`}
            >
                <header className="flex flex-col gap-5 md:gap-[30px]">
                    {!isInfoStep && (
                        <button
                            type="button"
                            className="typography-heading-03 flex w-fit items-center gap-1 font-medium text-[#6b7395] transition-colors hover:text-[#6653fb]"
                            onClick={() => setStep("info")}
                        >
                            <ArrowLeft aria-hidden="true" className="size-5" />
                            <span>이전 페이지</span>
                        </button>
                    )}
                    <div className="grid grid-cols-1 grid-rows-1">
                        <p className="typography-heading-02 col-start-1 row-start-1 self-start text-[#363636]">
                            직접입력으로
                        </p>
                        <h1 className="typography-heading-01 col-start-1 row-start-1 mt-[38px] self-start font-bold text-[#6653fb] md:mt-[52px]">
                            상품 등록
                        </h1>
                    </div>
                </header>

                <div className="flex flex-col gap-8">
                    <RegistrationStepper
                        steps={["상품 정보", "상태·가격"]}
                        currentStepIndex={step === "info" ? 0 : 1}
                    />

                    {isInfoStep ? (
                        <>
                            <DirectRegisterInfoStep
                                value={info}
                                categories={categories}
                                categoryStatus={categoryStatus}
                                onChange={updateInfo}
                                onNext={() => setStep("status")}
                            />
                            <DirectRegisterActions
                                primaryLabel="다음단계"
                                primaryType="submit"
                                primaryForm="direct-register-form"
                                onExit={() => setIsExitDialogOpen(true)}
                            />
                        </>
                    ) : (
                        <>
                            <DirectStatusPriceStep
                                {...statusPrice}
                                errors={statusPriceErrors}
                                onProductConditionChange={(value) =>
                                    updateStatusPrice("productCondition", value)
                                }
                                onIncludedItemChange={(value, checked) =>
                                    setStatusPrice((current) => ({
                                        ...current,
                                        includedItems: checked
                                            ? current.includedItems.includes(value)
                                                ? current.includedItems
                                                : [...current.includedItems, value]
                                            : current.includedItems.filter(
                                                  (item) => item !== value,
                                              ),
                                    }))
                                }
                                includedStatus={
                                    (statusPrice.includedItems[0] === includedStatusLabels.none
                                        ? "none"
                                        : statusPrice.includedItems[0] ===
                                            includedStatusLabels.partial
                                          ? "partial"
                                          : "all") as IncludedStatus
                                }
                                onIncludedStatusChange={(value) =>
                                    updateStatusPrice("includedItems", [
                                        includedStatusLabels[value],
                                    ])
                                }
                                onPriceChange={(value) => {
                                    updateStatusPrice("price", value);
                                    setStatusPriceErrors((current) => ({ ...current, price: "" }));
                                }}
                                onAllowPriceProposalChange={(checked) =>
                                    updateStatusPrice("allowPriceProposal", checked)
                                }
                                onTradeMethodChange={(value) => {
                                    setStatusPrice((current) => ({
                                        ...current,
                                        tradeMethod: value,
                                        deliveryType:
                                            value === "direct" ? null : current.deliveryType,
                                        deliveryFee: value === "direct" ? "" : current.deliveryFee,
                                        tradeLocation:
                                            value === "delivery" ? "" : current.tradeLocation,
                                    }));
                                    setStatusPriceErrors((current) => ({
                                        ...current,
                                        deliveryType: "",
                                        deliveryFee: "",
                                        tradeLocation: "",
                                    }));
                                }}
                                onDeliveryTypeChange={(value) => {
                                    setStatusPrice((current) => ({
                                        ...current,
                                        deliveryType: value,
                                        deliveryFee:
                                            value === "INCLUDED" ? "" : current.deliveryFee,
                                    }));
                                    setStatusPriceErrors((current) => ({
                                        ...current,
                                        deliveryType: "",
                                        deliveryFee: "",
                                    }));
                                }}
                                onDeliveryFeeChange={(value) => {
                                    updateStatusPrice("deliveryFee", value);
                                    setStatusPriceErrors((current) => ({
                                        ...current,
                                        deliveryFee: "",
                                    }));
                                }}
                                onTradeLocationChange={(value) => {
                                    setStatusPrice((current) => ({
                                        ...current,
                                        tradeLocation: value,
                                    }));
                                    setStatusPriceErrors((current) => ({
                                        ...current,
                                        tradeLocation: "",
                                    }));
                                }}
                            />
                            <DirectRegisterActions
                                primaryLabel="AI 분석 & 등록확인"
                                onPrimaryClick={handleStatusPriceSubmit}
                                onExit={() => setIsExitDialogOpen(true)}
                            />
                        </>
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
