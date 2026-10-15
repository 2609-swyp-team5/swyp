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
    DirectImagePreview,
    DirectRegisterInfoState,
    ProductEditInfoState,
    DirectStatusPriceErrors,
    DirectStatusPriceState,
} from "@/features/sell/components/direct-register/types";
import { SellAlertDialog } from "@/features/sell/components/shared/SellAlertDialog";
import {
    includedStatusApiValues,
    includedStatusLabels,
    type IncludedStatus,
} from "@/features/sell/components/shared/IncludedStatusField";
import { RegistrationStepper } from "@/features/sell/components/shared/RegistrationStepper";
import { useUpdateProductMutation } from "@/features/sell/hooks/mutations/useUpdateProductMutation";
import { productQueryKey } from "@/features/sell/hooks/queries/useProductQuery";
import {
    PRODUCT_PRICE_MAX,
    PRODUCT_PRICE_MIN,
    PRODUCT_PRICE_RANGE_ERROR,
} from "@/features/sell/schemas/productSchema";
import type {
    ProductRegisterError,
    ProductRegisterProgress,
    ProductResponse,
} from "@/features/sell/types";

type EditStep = "info" | "status";
type RegistrationMethod = "ai" | "direct";

const initialStatusPriceErrors: DirectStatusPriceErrors = {
    price: "",
    deliveryType: "",
    deliveryFee: "",
    tradeLocation: "",
};

function getInitialInfo(product: ProductResponse, categories: Category[]): ProductEditInfoState {
    const selectedCategory =
        categories.find((category) => category.id === product.category.id) ?? product.category;
    const parentCategory = categories.find((category) => category.id === selectedCategory.parentId);
    const grandparentCategory = parentCategory
        ? categories.find((category) => category.id === parentCategory.parentId)
        : undefined;
    return {
        images: product.imageUrls.map((url) => ({ file: null, url })),
        parentCategoryId: grandparentCategory
            ? String(grandparentCategory.id)
            : parentCategory
              ? String(parentCategory.id)
              : String(product.category.id),
        childCategoryId:
            grandparentCategory && parentCategory
                ? String(parentCategory.id)
                : parentCategory
                  ? String(product.category.id)
                  : "",
        subCategoryId: grandparentCategory ? String(product.category.id) : "",
        title: product.title,
        brand: product.brand ?? "",
        description: product.description ?? "",
        tags: product.tags,
    };
}

function getInitialStatusPrice(product: ProductResponse): DirectStatusPriceState {
    return {
        productCondition: product.condition,
        includedStatus: getIncludedStatus(product.includedItems),
        price: String(product.price),
        allowPriceProposal: product.allowPriceSuggestion,
        tradeMethod: product.tradeMethod === "DIRECT" ? "direct" : "delivery",
        deliveryType: product.deliveryType,
        deliveryFee: product.deliveryFee == null ? "" : String(product.deliveryFee),
        tradeLocation: product.preferredTradeRegion ?? "",
    };
}

function getIncludedStatus(includedItems: string[]): IncludedStatus {
    const value = includedItems[0];

    if (!value || value === includedStatusLabels.none) {
        return "none";
    }

    if (value === includedStatusLabels.partial) {
        return "partial";
    }

    return "all";
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
    const [step, setStep] = useState<EditStep>("info");
    const [info, setInfo] = useState(() => getInitialInfo(product, categories));
    const [statusPrice, setStatusPrice] = useState(() => getInitialStatusPrice(product));
    const [statusPriceErrors, setStatusPriceErrors] = useState(initialStatusPriceErrors);
    const [submissionError, setSubmissionError] = useState("");
    const [submissionErrorCode, setSubmissionErrorCode] = useState<string | null>(null);
    const [submissionStatus, setSubmissionStatus] = useState<
        "idle" | "loading" | "success" | "error"
    >("idle");
    const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
    const [submissionProgress, setSubmissionProgress] = useState<ProductRegisterProgress[]>([]);
    const updateProductMutation = useUpdateProductMutation({
        onProgress: (progress) => setSubmissionProgress((current) => [...current, progress]),
    });
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

    const updateInfo = (
        key: keyof DirectRegisterInfoState,
        value: DirectRegisterInfoState[keyof DirectRegisterInfoState],
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
        router.back();
    };

    const handleGoToManage = () => {
        const updatedQuery = submissionStatus === "success" ? "&updated=true" : "";
        router.push(`/sell/manage/${product.id}?method=${method}${updatedQuery}`);
    };

    const handleStatusPriceSubmit = async () => {
        const price = Number(statusPrice.price);
        const deliveryFee = Number(statusPrice.deliveryFee);
        const nextErrors: DirectStatusPriceErrors = {
            price:
                Number.isInteger(price) && price >= PRODUCT_PRICE_MIN && price <= PRODUCT_PRICE_MAX
                    ? ""
                    : PRODUCT_PRICE_RANGE_ERROR,
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
        setSubmissionProgress([]);
        setSubmissionStatus("loading");

        try {
            const newFiles = info.images.flatMap((image) => (image.file ? [image.file] : []));
            const imageUrls = info.images.filter((image) => !image.file).map((image) => image.url);

            const updatedProduct = await updateProductMutation.mutateAsync({
                id: product.id,
                files: newFiles,
                request: {
                    categoryId: Number(
                        info.subCategoryId || info.childCategoryId || info.parentCategoryId,
                    ),
                    title: info.title.trim(),
                    brand: info.brand.trim() || null,
                    description: info.description.trim(),
                    price: Number(statusPrice.price),
                    status: product.status,
                    condition: statusPrice.productCondition,
                    includedStatus: includedStatusApiValues[statusPrice.includedStatus],
                    allowPriceSuggestion: statusPrice.allowPriceProposal,
                    tradeMethod: statusPrice.tradeMethod === "direct" ? "DIRECT" : "DELIVERY",
                    deliveryType:
                        statusPrice.tradeMethod === "delivery" ? statusPrice.deliveryType : null,
                    deliveryFee:
                        statusPrice.tradeMethod === "delivery" &&
                        statusPrice.deliveryType === "PREPAID"
                            ? deliveryFee
                            : null,
                    preferredTradeRegion:
                        statusPrice.tradeMethod === "direct"
                            ? statusPrice.tradeLocation.trim() || null
                            : null,
                    imageUrls,
                    tags: info.tags,
                    includedItems: [includedStatusLabels[statusPrice.includedStatus]],
                },
            });

            queryClient.setQueryData(productQueryKey(product.id), updatedProduct);
            setSubmissionStatus("success");
        } catch (updateError) {
            setSubmissionError(getApiErrorMessage(updateError));
            setSubmissionErrorCode((updateError as ProductRegisterError).code ?? null);
            setSubmissionStatus("error");
        }
    };

    if (submissionStatus !== "idle") {
        return (
            <ProductRegistrationProcessing
                kind="edit"
                status={submissionStatus}
                errorMessage={submissionError}
                errorCode={submissionErrorCode}
                progress={submissionProgress[submissionProgress.length - 1]}
                progressHistory={submissionProgress}
                onRetry={handleStatusPriceSubmit}
                onGoToManage={handleGoToManage}
            />
        );
    }

    const isInfoStep = step === "info";

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
                            판매글을
                        </p>
                        <h1 className="typography-heading-01 col-start-1 row-start-1 mt-[38px] self-start font-bold text-[#6653fb] md:mt-[52px]">
                            수정해요
                        </h1>
                    </div>
                </header>

                <div className="flex flex-col gap-8">
                    <RegistrationStepper
                        steps={["상품 정보", "상태·가격"]}
                        currentStepIndex={isInfoStep ? 0 : 1}
                        ariaLabel="상품 수정 단계"
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
                                onIncludedStatusChange={(value) =>
                                    updateStatusPrice("includedStatus", value)
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
                                                  deliveryFee:
                                                      value === "direct" ? "" : current.deliveryFee,
                                                  tradeLocation:
                                                      value === "delivery"
                                                          ? ""
                                                          : current.tradeLocation,
                                              }
                                            : current,
                                    );
                                    setStatusPriceErrors((current) => ({
                                        ...current,
                                        deliveryType: "",
                                        deliveryFee: "",
                                        tradeLocation: "",
                                    }));
                                }}
                                onDeliveryTypeChange={(value) => {
                                    setStatusPrice((current) =>
                                        current
                                            ? {
                                                  ...current,
                                                  deliveryType: value,
                                                  deliveryFee:
                                                      value === "INCLUDED"
                                                          ? ""
                                                          : current.deliveryFee,
                                              }
                                            : current,
                                    );
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
                                    updateStatusPrice("tradeLocation", value);
                                    setStatusPriceErrors((current) => ({
                                        ...current,
                                        tradeLocation: "",
                                    }));
                                }}
                            />
                            <DirectRegisterActions
                                primaryLabel="수정 완료"
                                onPrimaryClick={handleStatusPriceSubmit}
                                onExit={handleExit}
                                exitLabel="수정 취소"
                            />
                        </>
                    )}
                </div>
            </section>

            <SellAlertDialog
                open={isExitDialogOpen}
                onClose={() => setIsExitDialogOpen(false)}
                onConfirm={handleConfirmExit}
                title="상품 수정을 취소하시겠습니까?"
                description={
                    <>
                        현재 수정 중인 내용은 저장되지 않으며,
                        <br />
                        취소하면 다시 복구할 수 없습니다.
                    </>
                }
                confirmLabel="수정 취소"
                cancelLabel="돌아가기"
                overlayClassName="!bg-[#272727]/50 !backdrop-blur-none"
            />
        </main>
    );
}
