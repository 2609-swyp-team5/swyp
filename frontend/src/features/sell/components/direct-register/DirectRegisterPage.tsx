"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { DirectRegisterActions } from "@/features/sell/components/direct-register/DirectRegisterActions";
import {
    DirectRegisterInfoStep,
    type DirectRegisterInfoState,
} from "@/features/sell/components/direct-register/DirectRegisterInfoStep";
import {
    DirectStatusPriceStep,
    type DirectStatusPriceErrors,
    type DirectStatusPriceState,
} from "@/features/sell/components/direct-register/DirectStatusPriceStep";
import type { DirectImagePreview } from "@/features/sell/components/direct-register/DirectImageUpload";
import { ProductRegistrationProcessing } from "@/features/sell/components/ProductRegistrationProcessing";
import { ExitDialog } from "@/features/sell/components/shared/ExitDialog";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useCategoriesQuery } from "@/features/sell/hooks/queries/useCategoriesQuery";
import { useCreateDirectProductMutation } from "@/features/sell/hooks/mutations/useCreateDirectProductMutation";

export type DirectRegisterStep = "info" | "status";

type DirectRegisterPageProps = {
    initialStep?: DirectRegisterStep;
};

function RegistrationStepper({ currentStep }: { currentStep: DirectRegisterStep }) {
    const steps = ["상품 정보", "상태·가격"];
    const currentStepIndex = currentStep === "info" ? 0 : 1;

    return (
        <ol aria-label="상품 등록 단계" className="flex items-center gap-2.5">
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

const initialInfoState: DirectRegisterInfoState = {
    images: [],
    parentCategoryId: "",
    childCategoryId: "",
    title: "",
    brand: "",
    description: "",
    tags: [],
};

const initialStatusPriceState: DirectStatusPriceState = {
    productCondition: "B",
    purchasePeriod: "6",
    includedItems: ["body", "charging-cable"],
    defectStatus: "none",
    price: "",
    allowPriceProposal: false,
    tradeMethod: "direct",
    deliveryType: null,
    tradeLocation: "",
};

const initialStatusPriceErrors: DirectStatusPriceErrors = {
    price: "",
    deliveryType: "",
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
        onError: (mutationError) => {
            setSubmissionError(getApiErrorMessage(mutationError));
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
            imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
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

        createDirectProductMutation.mutate({
            images: info.images.map((image) => image.file),
            request: {
                categoryId: Number(info.childCategoryId),
                title: info.title.trim(),
                brand: info.brand.trim() || null,
                description: info.description.trim(),
                price: Number(statusPrice.price),
                condition: statusPrice.productCondition,
                defectStatus: statusPrice.defectStatus === "has-defect" ? "ISSUES" : "NORMAL",
                purchasedMonths:
                    statusPrice.purchasePeriod === "unknown"
                        ? null
                        : Number(statusPrice.purchasePeriod),
                includedItems: statusPrice.includedItems,
                allowPriceSuggestion: statusPrice.allowPriceProposal,
                tradeMethod: statusPrice.tradeMethod === "direct" ? "DIRECT" : "DELIVERY",
                deliveryType: statusPrice.deliveryType,
                preferredTradeRegion: statusPrice.tradeLocation.trim() || null,
                tags: info.tags,
            },
        });
    };

    if (submissionStatus !== "idle") {
        return (
            <ProductRegistrationProcessing
                kind="direct"
                status={submissionStatus}
                errorMessage={submissionError}
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
                            직접입력으로
                        </p>
                        <h1 className="col-start-1 row-start-1 mt-[52px] self-start text-[60px] leading-[75px] font-bold tracking-[0.5px] text-[#6653fb]">
                            상품 등록
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
                                onPurchasePeriodChange={(value) =>
                                    updateStatusPrice("purchasePeriod", value)
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
                                    setStatusPrice((current) => ({
                                        ...current,
                                        tradeMethod: value,
                                        deliveryType:
                                            value === "direct" ? null : current.deliveryType,
                                        tradeLocation:
                                            value === "delivery" ? "" : current.tradeLocation,
                                    }));
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
                                primaryLabel="AI 분석 & 등록확인"
                                onPrimaryClick={handleStatusPriceSubmit}
                                onExit={() => setIsExitDialogOpen(true)}
                            />
                        </>
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
