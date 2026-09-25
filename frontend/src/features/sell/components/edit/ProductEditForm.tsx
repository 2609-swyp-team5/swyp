"use client";

import { useEffect, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getApiErrorMessage } from "@/common/lib/api/error";
import type { Category } from "@/features/sell/api/categoryApi";
import { ProductRegistrationProcessing } from "@/features/sell/components/ProductRegistrationProcessing";
import { DirectRegisterActions } from "@/features/sell/components/direct-register/DirectRegisterActions";
import { DirectRegisterInfoStep } from "@/features/sell/components/direct-register/DirectRegisterInfoStep";
import { DirectStatusPriceStep } from "@/features/sell/components/direct-register/DirectStatusPriceStep";
import type {
    DirectDefectStatus,
    DirectImagePreview,
    DirectPurchasePeriod,
    DirectRegisterInfoState,
    DirectStatusPriceErrors,
    DirectStatusPriceState,
} from "@/features/sell/components/direct-register/types";
import { ExitDialog } from "@/features/sell/components/shared/ExitDialog";
import { useUpdateProductMutation } from "@/features/sell/hooks/mutations/useUpdateProductMutation";
import { productQueryKey } from "@/features/sell/hooks/queries/useProductQuery";
import type { ProductResponse } from "@/features/sell/types";

type EditStep = "info" | "status";
type RegistrationMethod = "ai" | "direct";

const initialStatusPriceErrors: DirectStatusPriceErrors = {
    price: "",
    deliveryType: "",
};

function RegistrationStepper({ currentStep }: { currentStep: EditStep }) {
    const steps = ["상품 정보", "상태·가격"];
    const currentStepIndex = currentStep === "info" ? 0 : 1;

    return (
        <ol aria-label="상품 수정 단계" className="flex items-center gap-2.5">
            {steps.map((step, index) => (
                <li key={step} className="flex items-center gap-2.5">
                    <div className="flex items-center gap-2">
                        <span
                            className={`flex size-7 items-center justify-center rounded-full text-[13px] leading-[19px] font-bold ${
                                index <= currentStepIndex
                                    ? "bg-[#272727] text-white"
                                    : "bg-[#d3d3d3] text-[#6b6c7b]"
                            }`}
                        >
                            {index + 1}
                        </span>
                        <span
                            className={`text-[16px] leading-[25px] font-semibold tracking-[0.5px] ${
                                index <= currentStepIndex ? "text-[#363636]" : "text-[#d3d3d3]"
                            }`}
                        >
                            {step}
                        </span>
                    </div>
                    {index < steps.length - 1 && (
                        <span
                            aria-hidden="true"
                            className={`h-px w-[30px] ${
                                index < currentStepIndex ? "bg-[#272727]" : "bg-[#d3d3d3]"
                            }`}
                        />
                    )}
                </li>
            ))}
        </ol>
    );
}

function getInitialInfo(product: ProductResponse): DirectRegisterInfoState {
    return {
        images: product.imageUrls.map((url) => ({ file: null, url })),
        parentCategoryId:
            product.category.parentId === null ? "" : String(product.category.parentId),
        childCategoryId: String(product.category.id),
        title: product.title,
        brand: product.brand ?? "",
        description: product.description ?? "",
        tags: product.tags,
    };
}

function getInitialStatusPrice(product: ProductResponse): DirectStatusPriceState {
    const defectStatus: DirectDefectStatus =
        product.defectStatus === "ISSUES"
            ? "has-defect"
            : product.defectStatus === "UNKNOWN"
              ? "unknown"
              : "none";

    const purchasePeriod: DirectPurchasePeriod =
        product.purchasedMonths === null
            ? "unknown"
            : (String(product.purchasedMonths) as DirectPurchasePeriod);

    return {
        productCondition: product.condition,
        purchasePeriod,
        includedItems: product.includedItems,
        defectStatus,
        price: String(product.price),
        allowPriceProposal: product.allowPriceSuggestion,
        tradeMethod: product.tradeMethod === "DIRECT" ? "direct" : "delivery",
        deliveryType: product.deliveryType,
        tradeLocation: product.preferredTradeRegion ?? "",
    };
}

export function ProductEditForm({
    product,
    categories,
    categoryStatus,
    method,
}: {
    product: ProductResponse;
    categories: Category[];
    categoryStatus: "loading" | "error" | "ready";
    method: RegistrationMethod;
}) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const updateProductMutation = useUpdateProductMutation();
    const [step, setStep] = useState<EditStep>("info");
    const [info, setInfo] = useState(() => getInitialInfo(product));
    const [statusPrice, setStatusPrice] = useState(() => getInitialStatusPrice(product));
    const [statusPriceErrors, setStatusPriceErrors] = useState(initialStatusPriceErrors);
    const [submissionError, setSubmissionError] = useState("");
    const [submissionStatus, setSubmissionStatus] = useState<
        "idle" | "loading" | "success" | "error"
    >("idle");
    const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
    const imagesRef = useRef<DirectImagePreview[]>([]);

    useEffect(() => {
        imagesRef.current = info.images;
    }, [info]);

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
        setInfo((current) => (current ? { ...current, [key]: value } : current));
    };

    const updateStatusPrice = <K extends keyof DirectStatusPriceState>(
        key: K,
        value: DirectStatusPriceState[K],
    ) => {
        setStatusPrice((current) => (current ? { ...current, [key]: value } : current));
    };

    const handleExit = () => {
        setIsExitDialogOpen(true);
    };

    const handleConfirmExit = () => {
        setIsExitDialogOpen(false);
        router.push(`/sell/manage/${product.id}?method=${method}`);
    };

    const handleGoToManage = () => {
        router.push(`/sell/manage/${product.id}?method=${method}`);
    };

    const handleStatusPriceSubmit = async () => {
        const nextErrors: DirectStatusPriceErrors = {
            price: statusPrice.price ? "" : "희망 가격을 입력해 주세요.",
            deliveryType:
                statusPrice.tradeMethod === "delivery" && !statusPrice.deliveryType
                    ? "배송비 부담 방식을 선택해 주세요."
                    : "",
        };

        setStatusPriceErrors(nextErrors);

        if (Object.values(nextErrors).some(Boolean)) {
            return;
        }

        setSubmissionError("");
        setSubmissionStatus("loading");

        try {
            const newFiles = info.images.flatMap((image) => (image.file ? [image.file] : []));
            const imageUrls = info.images.filter((image) => !image.file).map((image) => image.url);

            const updatedProduct = await updateProductMutation.mutateAsync({
                id: product.id,
                files: newFiles,
                request: {
                    categoryId: Number(info.childCategoryId),
                    title: info.title.trim(),
                    brand: info.brand.trim() || null,
                    description: info.description.trim(),
                    price: Number(statusPrice.price),
                    status: product.status,
                    condition: statusPrice.productCondition,
                    purchasedMonths:
                        statusPrice.purchasePeriod === "unknown"
                            ? null
                            : Number(statusPrice.purchasePeriod),
                    defectStatus:
                        statusPrice.defectStatus === "has-defect"
                            ? "ISSUES"
                            : statusPrice.defectStatus === "unknown"
                              ? "UNKNOWN"
                              : "NORMAL",
                    allowPriceSuggestion: statusPrice.allowPriceProposal,
                    tradeMethod: statusPrice.tradeMethod === "direct" ? "DIRECT" : "DELIVERY",
                    deliveryType: statusPrice.deliveryType,
                    preferredTradeRegion: statusPrice.tradeLocation.trim() || null,
                    imageUrls,
                    tags: info.tags,
                    includedItems: statusPrice.includedItems,
                },
            });

            queryClient.setQueryData(productQueryKey(product.id), updatedProduct);
            setSubmissionStatus("success");
        } catch (updateError) {
            setSubmissionError(getApiErrorMessage(updateError));
            setSubmissionStatus("error");
        }
    };

    if (submissionStatus !== "idle") {
        return (
            <ProductRegistrationProcessing
                kind="ai"
                status={submissionStatus}
                errorMessage={submissionError}
                onRetry={handleStatusPriceSubmit}
                onGoToManage={handleGoToManage}
            />
        );
    }

    const isInfoStep = step === "info";

    return (
        <main className="flex flex-1 flex-col bg-white">
            <section
                className={`layout-container flex flex-1 flex-col gap-20 pt-16 ${
                    isInfoStep ? "pb-[120px]" : "pb-[80px]"
                }`}
            >
                <header className="flex flex-col gap-[30px]">
                    {!isInfoStep && (
                        <button
                            type="button"
                            className="flex w-fit items-center gap-1 text-[20px] leading-8 font-medium tracking-[0.5px] text-[#6b7395] transition-colors hover:text-[#6653fb]"
                            onClick={() => setStep("info")}
                        >
                            <ArrowLeft aria-hidden="true" className="size-5" />
                            <span>이전 페이지</span>
                        </button>
                    )}
                    <div className="grid grid-cols-1 grid-rows-1">
                        <p className="typography-heading-02 col-start-1 row-start-1 self-start text-[#363636]">
                            판매글을
                        </p>
                        <h1 className="col-start-1 row-start-1 mt-[52px] self-start text-[60px] leading-[75px] font-bold tracking-[0.5px] text-[#6653fb]">
                            수정해요
                        </h1>
                    </div>
                </header>

                <div className="flex flex-col gap-8">
                    <RegistrationStepper currentStep={step} />

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
                                onExit={handleExit}
                                exitLabel="수정 취소"
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
                                onPurchasePeriodChange={(value) =>
                                    updateStatusPrice("purchasePeriod", value)
                                }
                                onIncludedItemChange={(value, checked) =>
                                    setStatusPrice((current) =>
                                        current
                                            ? {
                                                  ...current,
                                                  includedItems: checked
                                                      ? current.includedItems.includes(value)
                                                          ? current.includedItems
                                                          : [...current.includedItems, value]
                                                      : current.includedItems.filter(
                                                            (item) => item !== value,
                                                        ),
                                              }
                                            : current,
                                    )
                                }
                                onDefectStatusChange={(value) =>
                                    updateStatusPrice("defectStatus", value)
                                }
                                onPriceChange={(value) => {
                                    updateStatusPrice("price", value);
                                    setStatusPriceErrors((current) => ({ ...current, price: "" }));
                                }}
                                onAllowPriceProposalChange={(checked) =>
                                    updateStatusPrice("allowPriceProposal", checked)
                                }
                                onTradeMethodChange={(value) => {
                                    setStatusPrice((current) =>
                                        current
                                            ? {
                                                  ...current,
                                                  tradeMethod: value,
                                                  deliveryType:
                                                      value === "direct"
                                                          ? null
                                                          : current.deliveryType,
                                              }
                                            : current,
                                    );
                                    setStatusPriceErrors((current) => ({
                                        ...current,
                                        deliveryType: "",
                                    }));
                                }}
                                onDeliveryTypeChange={(value) => {
                                    updateStatusPrice("deliveryType", value);
                                    setStatusPriceErrors((current) => ({
                                        ...current,
                                        deliveryType: "",
                                    }));
                                }}
                                onTradeLocationChange={(value) =>
                                    updateStatusPrice("tradeLocation", value)
                                }
                            />
                            <DirectRegisterActions
                                primaryLabel="AI 분석 & 등록"
                                onPrimaryClick={handleStatusPriceSubmit}
                                onExit={handleExit}
                                exitLabel="수정 취소"
                            />
                        </>
                    )}
                </div>
            </section>

            <ExitDialog
                open={isExitDialogOpen}
                onClose={() => setIsExitDialogOpen(false)}
                onConfirm={handleConfirmExit}
                confirmLabel="수정 취소"
            />
        </main>
    );
}
