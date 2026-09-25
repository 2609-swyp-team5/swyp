"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";

import { Button } from "@/common/components/ui/Button";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useProductQuery } from "@/features/sell/hooks/queries/useProductQuery";
import type { ProductCondition, ProductResponse } from "@/features/sell/types";

type RegistrationMethod = "ai" | "direct";

const conditionLabels: Record<ProductCondition, string> = {
    S: "미개봉",
    A: "거의 새 상품",
    B: "사용감 적음",
    C: "사용감 있음",
    D: "수리 필요",
};

const priceFormatter = new Intl.NumberFormat("ko-KR");

function formatRecommendedPrice(value: number | null) {
    return value === null
        ? { value: "AI 추천 가격을 확인할 수 없습니다", unit: "" }
        : { value: priceFormatter.format(value), unit: "원" };
}

function InfoField({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#363636]">
                {label}
            </p>
            <div className="flex min-h-[42px] items-center rounded-[5px] border border-[#d3d3d3] bg-[#fafbff] px-2.5 py-1.5">
                <p className="min-w-0 text-[20px] leading-8 font-medium tracking-[0.5px] break-words text-[#545D82]">
                    {value}
                </p>
            </div>
        </div>
    );
}

function ProductImages({ product }: { product: ProductResponse }) {
    if (product.imageUrls.length === 0) {
        return (
            <div className="flex h-[200px] items-center justify-center rounded-lg bg-[#d3d3d3] text-sm text-[#6b6c7b]">
                등록된 이미지가 없습니다.
            </div>
        );
    }

    return (
        <div
            className="flex gap-[15px] overflow-x-auto pb-2"
            tabIndex={product.imageUrls.length > 3 ? 0 : undefined}
            aria-label="등록한 상품 사진"
        >
            {product.imageUrls.map((imageUrl, index) => (
                <Image
                    key={`${imageUrl}-${index}`}
                    src={imageUrl}
                    alt={`${product.title} 상품 사진 ${index + 1}`}
                    width={1}
                    height={1}
                    unoptimized
                    className="h-[200px] w-auto max-w-full flex-none rounded-lg border border-[#d3d3d3] object-contain"
                />
            ))}
        </div>
    );
}

function AiRecommendation({ suggestedPrice }: { suggestedPrice: number | null }) {
    const recommendedPrice = formatRecommendedPrice(suggestedPrice);

    return (
        <section className="flex w-full flex-col gap-[30px] rounded-[20px] bg-gradient-to-b from-[#ededfd] to-white px-6 py-5 md:px-10">
            <div className="flex items-center gap-[15px]">
                <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-b from-[#6653fb] to-[#b1a9ef] text-[22px] text-white">
                    ✦
                </div>
                <h2 className="text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#6653fb]">
                    AI 추천
                </h2>
            </div>

            <div className="relative mx-auto block h-[543px] w-[1008px] max-w-full">
                <div
                    role="img"
                    aria-label="AI 추천 일러스트"
                    className="absolute bottom-0 left-0 z-20 h-[543px] w-[523px] overflow-hidden"
                >
                    <div
                        aria-hidden="true"
                        className="absolute bg-no-repeat"
                        style={{
                            backgroundImage: "url('/figma/product-ai-recommendation.png')",
                            backgroundSize: "100% 100%",
                            height: "114.17%",
                            left: "-36.63%",
                            top: "-14.17%",
                            width: "158.09%",
                        }}
                    />
                </div>

                <div className="absolute top-0 left-[415px] z-10 h-[464px] w-[593px]">
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-no-repeat drop-shadow-[0_6px_20px_rgba(102,83,251,0.18)]"
                        style={{
                            backgroundSize: "100% 100%",
                            backgroundImage: "url('/figma/product-ai-recommendation-bubble.svg')",
                        }}
                    />
                    <div className="absolute top-[30px] left-[55px] rounded-full bg-[#f0e8ff] px-5 py-1 text-[22px] leading-[30px] font-bold tracking-[0.5px] text-[#6653fb]">
                        ✦ AI가 분석한 적정 가격은...
                    </div>
                    <div className="absolute top-[100px] left-[55px] w-[430px] text-[60px] leading-[75px] font-bold tracking-[0.5px] text-black">
                        {suggestedPrice === null ? (
                            <p className="text-[28px] leading-10">{recommendedPrice.value}</p>
                        ) : (
                            <>
                                <p>저는</p>
                                <p>
                                    <span className="relative inline-block">
                                        <span
                                            aria-hidden="true"
                                            className="absolute right-0 bottom-[7px] left-0 h-[9px] rounded-[2px] bg-[#c7b9ff]"
                                        />
                                        <span className="relative z-10 bg-gradient-to-r from-[#5a31ff] to-[#8b52ff] bg-clip-text text-transparent">
                                            {recommendedPrice.value}
                                            {recommendedPrice.unit}
                                        </span>
                                    </span>
                                    을
                                </p>
                                <p>추천해요!</p>
                            </>
                        )}
                    </div>
                    {suggestedPrice !== null && (
                        <button
                            type="button"
                            className="absolute top-[301px] left-[390px] inline-flex cursor-pointer items-center gap-1 rounded-full bg-[#f0e8ff] px-6 py-2 text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#6653fb] transition-colors duration-200 hover:bg-[#e5d8ff] focus-visible:ring-2 focus-visible:ring-[#6653fb] focus-visible:ring-offset-2"
                        >
                            <span>자세히 보기</span>
                            <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.25} />
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}

function ProductReview({
    product,
    method,
}: {
    product: ProductResponse;
    method: RegistrationMethod;
}) {
    return (
        <>
            <AiRecommendation suggestedPrice={product.suggestedPrice} />

            <section className="flex w-full flex-col gap-10">
                <div className="flex items-center justify-between gap-4">
                    <h2 className="text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#363636]">
                        상품 등록 내용
                    </h2>
                    <span className="shrink-0 rounded-full bg-[#363636] px-5 py-1 text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-white">
                        ✦ {method === "ai" ? "AI 작성" : "직접 작성"}
                    </span>
                </div>

                <ProductImages product={product} />

                <div className="flex w-full flex-col gap-[60px] rounded-[20px] border border-[#dedee6] bg-white px-6 py-8 md:px-[60px] md:py-[50px]">
                    <InfoField label="상품명" value={product.title} />

                    <div className="flex flex-col gap-6 md:flex-row md:gap-5">
                        <InfoField label="카테고리" value={product.category.name} />
                        <InfoField label="상품 상태" value={conditionLabels[product.condition]} />
                    </div>

                    <div className="flex flex-col gap-3">
                        <p className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#363636]">
                            상세 설명
                        </p>
                        <div className="min-h-[140px] rounded-[5px] border border-[#d3d3d3] bg-[#fafbff] p-5">
                            <p className="text-[20px] leading-8 font-medium tracking-[0.5px] whitespace-pre-wrap text-[#545D82]">
                                {product.description ?? "null"}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2.5">
                        <p className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#363636]">
                            추천 태그
                        </p>
                        <div className="flex flex-wrap gap-3">
                            {product.tags.length > 0 ? (
                                product.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full bg-[#dedee6] px-5 py-1 text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#363636]"
                                    >
                                        #{tag}
                                    </span>
                                ))
                            ) : (
                                <span className="text-sm text-[#6b6c7b]">null</span>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <div className="flex flex-col-reverse items-stretch justify-end gap-5 sm:flex-row sm:items-center">
                <Button
                    type="button"
                    className="h-[54px] rounded-full bg-[#dedee6] px-[70px] py-3 text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#6b6c7b] hover:bg-[#d3d3d3]"
                >
                    직접 수정하기
                </Button>
                <Button
                    type="button"
                    className="h-[54px] rounded-full bg-[#6653fb] px-[70px] py-3 text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-white hover:bg-[#5745e7]"
                >
                    게시하기
                </Button>
            </div>
        </>
    );
}

function ReviewStatus({ children }: { children: string }) {
    return (
        <main className="flex flex-1 items-center justify-center bg-white px-6 py-24">
            <p className="text-center text-lg font-semibold text-[#6b6c7b]">{children}</p>
        </main>
    );
}

export default function ProductReviewPage() {
    const params = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const productId = Number(params.id);
    const method: RegistrationMethod = searchParams.get("method") === "direct" ? "direct" : "ai";
    const { data: product, error, isPending } = useProductQuery(productId);

    if (!Number.isInteger(productId) || productId <= 0) {
        return <ReviewStatus>올바르지 않은 상품입니다.</ReviewStatus>;
    }

    if (isPending) {
        return <ReviewStatus>판매글을 불러오는 중이에요.</ReviewStatus>;
    }

    if (error || !product) {
        return <ReviewStatus>{getApiErrorMessage(error)}</ReviewStatus>;
    }

    return (
        <main className="flex flex-1 flex-col bg-white">
            <section className="layout-container flex flex-1 flex-col gap-20 pt-16 pb-[120px]">
                <header className="flex flex-col gap-[30px]">
                    <Link
                        href="/sell/register"
                        className="inline-flex w-fit items-center gap-1 text-[20px] leading-8 font-medium tracking-[0.5px] text-[#6b7395] transition-colors hover:text-[#6653fb]"
                    >
                        <ArrowLeft aria-hidden="true" className="size-5" strokeWidth={2} />
                        등록 방식 선택
                    </Link>
                    <div>
                        <p className="text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#363636]">
                            AI 초안을 검토하고 최종 확인하세요
                        </p>
                        <h1 className="mt-[10px] text-[48px] leading-[60px] font-bold tracking-[0.5px] text-[#6653fb] md:mt-0 md:text-[60px] md:leading-[75px]">
                            판매글 확인
                        </h1>
                    </div>
                </header>

                <ProductReview product={product} method={method} />
            </section>
        </main>
    );
}
