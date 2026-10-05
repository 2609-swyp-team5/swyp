"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Heart, Info } from "lucide-react";

import { Badge } from "@/common/components/ui/Badge";
import { Button } from "@/common/components/ui/Button";
import { cn } from "@/common/lib/utils";
import { useInterestToggle } from "@/features/search/hooks/useInterestToggle";
import { LoginRequiredDialog } from "@/features/auth/components/LoginRequiredDialog";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useSearchProductDetailQuery } from "@/features/search/hooks/queries/useSearchProductDetailQuery";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { formatRelativeCreatedAt } from "@/features/search/utils/formatRelativeCreatedAt";
import { MarketAnalysisSection } from "@/features/product-management/components/analysis/market-analysis/MarketAnalysisSection";
import { useProductManagementSectionsQuery } from "@/features/product-management/hooks/useProductManagementSectionsQuery";
import { useProductAnalysisQuery } from "@/features/product-management/hooks/useProductAnalysisQuery";
import { ProductCompetitionSection } from "@/features/product-management/components/competition/ProductCompetitionSection";

export function SearchProductDetailPage({ targetId }: { targetId: number }) {
    const [selectedImage, setSelectedImage] = useState(0);
    const [analysisProductId, setAnalysisProductId] = useState<number | null>(null);
    const interests = useInterestToggle();
    const {
        data: product,
        isPending,
        error,
        refetch,
        isFetching,
    } = useSearchProductDetailQuery(targetId);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    // 회원이면 이미 있는 분석 결과를 미리 조회해, 있으면 버튼을 누르지 않아도 바로 보여준다(분석 조회는 회원 전용)
    const existingAnalysis = useProductAnalysisQuery(targetId, {
        enabled: Boolean(product) && isInitialized && isLoggedIn,
        perspective: "BUY",
    });
    const analysisEnabled =
        Boolean(product) && (analysisProductId === targetId || Boolean(existingAnalysis.data));
    const sections = useProductManagementSectionsQuery(targetId, {
        enabled: analysisEnabled,
        perspective: "BUY",
        summaryEnabled: false,
        // 추천 상태·사유와 요약 지표만 보여주므로 가격 변화 추이·감가 상각률은 조회하지 않는다
        chartsEnabled: false,
    });
    const analysisFetching =
        sections.productAnalysis.isFetching || sections.productCompetition.isFetching;
    const liked = interests.interests.some(
        (item) => item.source === product?.source && item.targetId === targetId,
    );
    const imageIndex = selectedImage < (product?.imageUrls.length ?? 0) ? selectedImage : 0;
    const average = product?.marketAveragePrice;
    const difference =
        product && average && average > 0
            ? Math.round(((product.price - average) / average) * 100)
            : null;
    const comparison =
        difference === null
            ? "? 비교 데이터 부족"
            : difference === 0
              ? "≈ 평균 수준이에요"
              : difference < 0
                ? `↓ 평균보다 ${Math.abs(difference)}% 낮아요`
                : `↑ 평균보다 ${difference}% 높아요`;
    const platform =
        product?.source === "OUR" ? "지금이니?!" : (product?.platformName ?? "외부 매물");
    const status =
        product?.status === "SOLD_OUT"
            ? "판매완료"
            : product?.status === "DRAFT"
              ? "임시저장"
              : product?.status === "RESERVED"
                ? "예약중"
                : "판매중";

    return (
        <main className="flex-1 bg-white text-[#363636]">
            <LoginRequiredDialog
                open={interests.loginNoticeOpen}
                onOpenChange={interests.onLoginNoticeOpenChange}
            />
            <div className="layout-container flex flex-col gap-[30px] py-10 lg:py-20">
                <Link
                    href="/search"
                    className="self-start text-[20px] leading-8 font-medium tracking-[0.5px] text-[#6b7395] hover:text-[#6653fb]"
                >
                    ← 이전 페이지
                </Link>

                {isPending && (
                    <p role="status" className="text-[#83889e]">
                        상품 정보를 불러오는 중입니다.
                    </p>
                )}
                {error && (
                    <div role="alert" className="text-destructive flex items-center gap-3 text-sm">
                        <p>{getApiErrorMessage(error)}</p>
                        <Button
                            variant="outline"
                            disabled={isFetching}
                            onClick={() => void refetch()}
                        >
                            다시 시도
                        </Button>
                    </div>
                )}
                {product && (
                    <>
                        <div>
                            {product.source === "EXTERNAL" && (
                                <p className="mb-6 flex items-start gap-[5px] text-[12px] leading-5 tracking-[-0.5px] text-[#272727]">
                                    <Info
                                        aria-hidden="true"
                                        strokeWidth={1.5}
                                        className="mt-0.5 size-[15px] shrink-0"
                                    />
                                    <span>
                                        이 상품 정보는 {formatRelativeCreatedAt(product.updatedAt)}
                                        에 확인되었습니다. 외부 플랫폼에서 최신 상태를 확인해
                                        주세요.
                                    </span>
                                </p>
                            )}

                            <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
                                <section
                                    aria-label="상품 이미지"
                                    className="flex min-w-0 flex-col gap-4"
                                >
                                    {product.imageUrls.length > 0 ? (
                                        <div className="relative h-[280px] w-full overflow-hidden rounded-xl border border-[#fafbff] bg-[#d3d3d3] sm:h-[380px]">
                                            <Image
                                                src={product.imageUrls[imageIndex]}
                                                alt={`${product.title} 이미지 ${imageIndex + 1}`}
                                                fill
                                                unoptimized
                                                sizes="(max-width: 1023px) 100vw, 50vw"
                                                className="object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            role="img"
                                            aria-label="상품 이미지 없음"
                                            className="h-[280px] w-full rounded-xl border border-[#fafbff] bg-[#d3d3d3] sm:h-[380px]"
                                        />
                                    )}
                                    {product.imageUrls.length > 1 && (
                                        <div
                                            className="flex gap-3 overflow-x-auto"
                                            role="group"
                                            aria-label="상품 이미지 선택"
                                        >
                                            {product.imageUrls.slice(1).map((url, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    aria-label={`상품 이미지 ${index + 2}`}
                                                    aria-pressed={imageIndex === index + 1}
                                                    onClick={() => setSelectedImage(index + 1)}
                                                    className={cn(
                                                        "relative size-20 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 bg-[#d3d3d3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6653fb]",
                                                        imageIndex === index + 1
                                                            ? "border-[#6653fb]"
                                                            : "border-[#fafbff]",
                                                    )}
                                                >
                                                    <Image
                                                        src={url}
                                                        alt=""
                                                        fill
                                                        unoptimized
                                                        sizes="80px"
                                                        className="object-cover"
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                <section
                                    aria-label="상품 정보"
                                    className="flex min-w-0 flex-col gap-[50px] lg:min-h-[523px]"
                                >
                                    <div className="flex flex-col gap-[30px]">
                                        <div className="flex gap-2">
                                            <Badge
                                                className={cn(
                                                    "h-auto rounded-full border-0 px-3 py-1 text-[13px] leading-5 font-semibold tracking-[-0.5px] text-white",
                                                    platform === "당근마켓"
                                                        ? "bg-[#ff6f0f]"
                                                        : platform === "번개장터"
                                                          ? "bg-[#83889e]"
                                                          : "bg-[#6653fb]",
                                                )}
                                            >
                                                {platform}
                                            </Badge>
                                            <Badge className="h-auto rounded-full border-0 bg-[#fafbff] px-3 py-1 text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#6653fb]">
                                                {status}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <h1 className="text-[26px] leading-[38px] font-bold tracking-[0.5px] break-words sm:text-[30px] sm:leading-[42px]">
                                                {product.title}
                                            </h1>
                                            <div className="flex flex-wrap items-center">
                                                <p className="text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#fa503d]">
                                                    {product.price.toLocaleString("ko-KR")}원
                                                </p>
                                                <Badge className="font-brand h-auto rounded-full border-0 bg-[#fafbff] px-2.5 py-1 text-[12px] leading-[18px] font-semibold text-[#6653fb]">
                                                    {comparison}
                                                </Badge>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            aria-pressed={liked}
                                            onClick={() =>
                                                interests.toggle({
                                                    source: product.source,
                                                    targetId: product.id,
                                                })
                                            }
                                            disabled={interests.disabled}
                                            className="font-brand h-12 w-full max-w-[295px] rounded-[50px] border-[1.5px] border-[#d3d3d3] bg-white text-[16px] leading-6 font-semibold text-[#363636] hover:bg-[#fafbff]"
                                        >
                                            <Heart
                                                aria-hidden="true"
                                                className={cn("size-4", liked && "text-[#fa503d]")}
                                                fill={liked ? "currentColor" : "none"}
                                            />
                                            {liked ? "관심상품에 추가됨" : "관심상품에 추가"}
                                        </Button>
                                        {interests.errorMessage && (
                                            <div
                                                role="alert"
                                                className="text-destructive flex flex-col items-start gap-3 text-sm"
                                            >
                                                <p>{interests.errorMessage}</p>
                                                {interests.canRetry && (
                                                    <Button
                                                        variant="outline"
                                                        onClick={interests.retry}
                                                    >
                                                        관심상품 다시 조회
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-sm text-[#83889e]">
                                        {product.category.name}
                                    </p>
                                    {product.description && (
                                        <p className="text-sm leading-6 break-words whitespace-pre-wrap">
                                            {product.description}
                                        </p>
                                    )}
                                    {product.source === "EXTERNAL" && (
                                        <div className="flex flex-col gap-5 rounded-xl border border-[#fafbff] bg-[#fafbff] px-[30px] py-4 text-[#83889e]">
                                            <div className="flex flex-col gap-2.5">
                                                <h2 className="flex items-center gap-2 text-[16px] leading-[25px] font-semibold tracking-[0.5px]">
                                                    <ExternalLink
                                                        aria-hidden="true"
                                                        strokeWidth={1.5}
                                                        className="size-6 shrink-0"
                                                    />
                                                    {platform} 판매글 이동
                                                </h2>
                                                <p className="text-[16px] leading-[25px] tracking-normal">
                                                    외부 사이트에서 판매자의 상세 설명과
                                                    <br className="hidden sm:block" /> 구매 조건을
                                                    확인할 수 있습니다.
                                                </p>
                                            </div>
                                            {product.externalUrl ? (
                                                <Button
                                                    asChild
                                                    className="h-[52px] w-full rounded-md bg-[#83889e] text-[16px] leading-6 font-semibold text-white"
                                                >
                                                    <a
                                                        href={product.externalUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        판매글 바로가기
                                                    </a>
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    disabled
                                                    title="판매글 링크가 없습니다."
                                                    className="h-[52px] w-full rounded-md bg-[#83889e] text-[16px] leading-6 font-semibold text-white disabled:opacity-100"
                                                >
                                                    판매글 바로가기
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>
                    </>
                )}

                {product && (
                    <div className="flex flex-col items-center justify-center gap-[15px] rounded-[5px] border border-[#eaeafd] bg-[#fafbff] px-2.5 py-[50px]">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={!product || analysisFetching}
                            onClick={() => setAnalysisProductId(targetId)}
                            className="h-auto gap-2.5 rounded-full border-[#6653fb] bg-white px-[30px] py-[5px] text-[#6653fb] disabled:opacity-100"
                        >
                            <span
                                aria-hidden="true"
                                className="text-[22px] leading-[33px] font-normal tracking-[-0.2578px]"
                            >
                                ✦
                            </span>
                            <span className="text-[20px] leading-[30px] font-semibold tracking-[0.5px]">
                                {analysisFetching ? "분석 불러오는 중" : "AI 분석 보기"}
                            </span>
                        </Button>
                        <p className="text-center text-[16px] leading-[25px] font-normal tracking-normal text-[#83889e]">
                            AI가 시세 분석과 거래 타이밍을 종합해 알려드려요.
                        </p>
                    </div>
                )}
                {analysisEnabled && (
                    <div className="flex min-w-0 flex-col gap-4">
                        <MarketAnalysisSection
                            result={sections.productAnalysis.data}
                            error={sections.productAnalysis.error}
                            isPending={sections.productAnalysis.isPending}
                            priceTrendQuery={sections.productPriceTrend}
                            valuationForecastQuery={sections.productValuationForecast}
                            summaryOnly
                        />
                        <ProductCompetitionSection
                            query={sections.productCompetition}
                            heading="비슷한 상품"
                            showCompetitionMeta={false}
                        />
                        {(sections.productAnalysis.error || sections.productCompetition.error) && (
                            <Button
                                variant="outline"
                                className="self-end"
                                disabled={analysisFetching}
                                onClick={() => {
                                    void sections.productAnalysis.refetch();
                                    void sections.productCompetition.refetch();
                                }}
                            >
                                AI 분석 다시 조회
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
