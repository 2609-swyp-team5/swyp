"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ExternalLink, Heart, Info } from "lucide-react";

import { Badge } from "@/common/components/ui/Badge";
import { Button } from "@/common/components/ui/Button";
import { cn } from "@/common/lib/utils";
import { useInterestToggle } from "@/features/interest/hooks/useInterestToggle";
import { LoginRequiredDialog } from "@/features/auth/components/LoginRequiredDialog";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useSearchProductDetailQuery } from "@/features/search/hooks/queries/useSearchProductDetailQuery";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { formatRelativeCreatedAt } from "@/features/search/utils/formatRelativeCreatedAt";
import { formatConditionText } from "@/features/search/utils/productMetaText";
import { SearchProductDetailSkeleton } from "@/features/search/components/detail/SearchProductDetailSkeleton";
import { ExternalListingDialog } from "@/features/search/components/detail/ExternalListingDialog";
import { InterestAddedDialog } from "@/features/search/components/detail/InterestAddedDialog";
import { useCategoriesQuery } from "@/features/sell/hooks/queries/useCategoriesQuery";
import { tradeMethodLabels } from "@/features/sell/components/manage/productReviewUtils";
import { MarketAnalysisSection } from "@/features/product-management/components/analysis/market-analysis/MarketAnalysisSection";
import { useProductManagementSectionsQuery } from "@/features/product-management/hooks/useProductManagementSectionsQuery";
import { useRequestProductAnalysisMutation } from "@/features/product-management/hooks/useRequestProductAnalysisMutation";

// Figma LinkCard: 판매글 바로가기·관심상품 추가를 같은 너비로 나란히 둔다
const detailActionClass =
    "h-[45px] min-w-0 flex-1 gap-2 rounded-[5px] border border-[#d3d3d3] bg-[#fafbff] px-5 py-2.5 text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#83889e] hover:bg-[#f1f2f8] hover:text-[#83889e] disabled:opacity-100";

export function SearchProductDetailPage({ targetId }: { targetId: number }) {
    const [selectedImage, setSelectedImage] = useState(0);
    const [externalDialogOpen, setExternalDialogOpen] = useState(false);
    const [interestDialogOpen, setInterestDialogOpen] = useState(false);
    const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);
    const [analysisLoginNoticeOpen, setAnalysisLoginNoticeOpen] = useState(false);
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
    // 관심상품 상세와 같은 AI 시세 분석(구매자 관점, 같은 쿼리 키라 캐시 공유) — 분석 조회는 회원 전용이라 회원만 바로 보여 주고,
    // 가격 추이·감가·경쟁 상품은 "더보기"를 펼칠 때 부른다
    const canViewAnalysis = Boolean(product) && isInitialized && isLoggedIn;
    const sections = useProductManagementSectionsQuery(targetId, {
        enabled: canViewAnalysis,
        perspective: "BUY",
        summaryEnabled: false,
        analysisDetailsEnabled: showAnalysisDetails,
        competitionEnabled: showAnalysisDetails,
    });
    const requestAnalysisMutation = useRequestProductAnalysisMutation();
    const handleAnalysisRetry = async () => {
        try {
            await requestAnalysisMutation.mutateAsync({
                productId: targetId,
                perspective: "BUY",
            });
        } catch {
            // mutation.error를 진행 다이얼로그에서 표시한다.
        }
    };
    const liked = product?.favorite ?? false;
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
    // 목록(ProductListItemResponse.deliveryAvailable)과 같은 기준: 외부 매물은 택배 가능 고정, 우리 상품은 거래 방식이 택배일 때만
    const deliveryAvailable =
        product?.source === "EXTERNAL"
            ? true
            : product?.tradeMethod
              ? product.tradeMethod === "DELIVERY"
              : null;
    // 상세 응답의 카테고리에는 상위 이름이 없어 공개 카테고리 목록(10분 캐시)에서 찾는다
    const categories = useCategoriesQuery();
    const parentCategoryName = categories.data?.find(
        (category) => category.id === product?.category.parentId,
    )?.name;
    const tradeMethodLabel = product?.tradeMethod
        ? tradeMethodLabels[product.tradeMethod]
        : deliveryAvailable
          ? tradeMethodLabels.DELIVERY
          : null;
    // Figma 정보 표: 2열 그리드가 행 순서로 채워지므로 [상품상태, 카테고리], [구성품, 거래방식], [등록일] 순서로 둔다.
    // 가격 아래 요약 줄은 두지 않고 하자 상태·거래 지역·등록 시간도 이 표에 합친다.
    const productInfoRows: [string, string][] = product
        ? [
              [
                  "상품상태",
                  formatConditionText(product.condition, product.defectStatus).join(" · ") || "-",
              ],
              ["카테고리", [parentCategoryName, product.category.name].filter(Boolean).join(" · ")],
              ["구성품", product.includedItems.join(" · ") || "-"],
              [
                  "거래방식",
                  [tradeMethodLabel, product.preferredTradeRegion].filter(Boolean).join(" · ") ||
                      "-",
              ],
              ["등록일", formatRelativeCreatedAt(product.createdAt)],
          ]
        : [];
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
            <LoginRequiredDialog
                open={analysisLoginNoticeOpen}
                onOpenChange={setAnalysisLoginNoticeOpen}
            />
            <div className="layout-container flex flex-col gap-[30px] py-10 lg:py-20">
                <Link
                    href="/search"
                    className="flex items-center gap-2 self-start text-[20px] leading-8 font-medium tracking-[0.5px] text-[#6b7395] hover:text-[#6653fb]"
                >
                    <ArrowLeft aria-hidden="true" className="size-5 shrink-0" />
                    <span>이전 페이지</span>
                </Link>

                {isPending && <SearchProductDetailSkeleton />}
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
                        {product.externalUrl && (
                            <ExternalListingDialog
                                open={externalDialogOpen}
                                onOpenChange={setExternalDialogOpen}
                                platformName={platform}
                                url={product.externalUrl}
                                checkedAt={formatRelativeCreatedAt(product.updatedAt)}
                                statusLabel={status}
                            />
                        )}
                        <InterestAddedDialog
                            open={interestDialogOpen}
                            onOpenChange={setInterestDialogOpen}
                            price={product.price}
                        />
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
                                    className="flex min-w-0 flex-col gap-10 lg:min-h-[523px]"
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
                                                          : platform === "중고나라"
                                                            ? "bg-[#ff0000]"
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
                                    </div>

                                    <div className="flex flex-col gap-[15px]">
                                        <dl className="grid grid-cols-1 gap-x-[30px] gap-y-2.5 text-[14px] leading-[22px] sm:grid-cols-[max-content_max-content]">
                                            {productInfoRows.map(([label, value]) => (
                                                <div key={label} className="flex min-w-0 gap-2.5">
                                                    <dt className="shrink-0 text-[#83889e]">
                                                        {label}
                                                    </dt>
                                                    <dd className="min-w-0 break-words text-[#464646]">
                                                        {value}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                        <div className="flex flex-col gap-[5px] border-t border-[#d3d3d3] py-2.5 text-[14px] leading-[22px]">
                                            <h2 className="text-[#6b6c7b]">상품 설명</h2>
                                            <p className="break-words whitespace-pre-wrap text-[#464646]">
                                                {product.description?.trim() ||
                                                    "판매자의 상세 설명과 구매 조건은 판매글에서 확인할 수 있습니다."}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <div className="flex gap-2.5">
                                            {product.source === "EXTERNAL" &&
                                                (product.externalUrl ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        aria-haspopup="dialog"
                                                        onClick={() => setExternalDialogOpen(true)}
                                                        className={detailActionClass}
                                                    >
                                                        <ExternalLink
                                                            aria-hidden="true"
                                                            strokeWidth={1.5}
                                                            className="size-6 shrink-0"
                                                        />
                                                        판매글 바로가기
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        disabled
                                                        title="판매글 링크가 없습니다."
                                                        className={detailActionClass}
                                                    >
                                                        <ExternalLink
                                                            aria-hidden="true"
                                                            strokeWidth={1.5}
                                                            className="size-6 shrink-0"
                                                        />
                                                        판매글 바로가기
                                                    </Button>
                                                ))}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                aria-pressed={liked}
                                                onClick={() =>
                                                    interests.toggle(
                                                        {
                                                            source: product.source,
                                                            targetId: product.id,
                                                        },
                                                        {
                                                            interestId: product.interestId,
                                                            // 하트와 함께 바로 띄우고, 등록이 실패하면 닫는다(오류는 아래 alert로 표시)
                                                            onAdd: () =>
                                                                setInterestDialogOpen(true),
                                                            onAddFailed: () =>
                                                                setInterestDialogOpen(false),
                                                        },
                                                    )
                                                }
                                                disabled={interests.disabled}
                                                className={detailActionClass}
                                            >
                                                <Heart
                                                    aria-hidden="true"
                                                    strokeWidth={1.5}
                                                    className={cn(
                                                        "size-5 shrink-0",
                                                        liked && "text-[#fa503d]",
                                                    )}
                                                    fill={liked ? "currentColor" : "none"}
                                                />
                                                {liked ? "관심상품 추가됨" : "관심상품 추가"}
                                            </Button>
                                        </div>
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
                                </section>
                            </div>
                        </div>
                    </>
                )}

                {product && canViewAnalysis && (
                    <MarketAnalysisSection
                        result={sections.productAnalysis.data}
                        error={sections.productAnalysis.error}
                        isPending={sections.productAnalysis.isPending}
                        competitionQuery={sections.productCompetition}
                        priceDistributionQuery={sections.productPriceDistribution}
                        priceTrendQuery={sections.productPriceTrend}
                        valuationForecastQuery={sections.productValuationForecast}
                        perspective="BUY"
                        variant="management"
                        isDetailsOpen={showAnalysisDetails}
                        onDetailsOpenChange={setShowAnalysisDetails}
                        analysisRetry={{
                            isFetching:
                                sections.productAnalysis.isFetching ||
                                requestAnalysisMutation.isPending,
                            isProcessing: requestAnalysisMutation.isProcessing,
                            refetch: sections.productAnalysis.refetch,
                            request:
                                product.status === "SOLD_OUT" ? undefined : handleAnalysisRetry,
                            progress: requestAnalysisMutation.progress,
                            notice: requestAnalysisMutation.notice,
                            error: requestAnalysisMutation.error,
                            reset: requestAnalysisMutation.reset,
                        }}
                    />
                )}
                {/* 비회원은 기존 버튼 레이아웃을 두고, 누르면 로그인 안내(분석 조회는 회원 전용) */}
                {product && isInitialized && !isLoggedIn && (
                    <div className="flex flex-col items-center justify-center gap-[15px] rounded-[5px] border border-[#eaeafd] bg-[#fafbff] px-2.5 py-[50px]">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAnalysisLoginNoticeOpen(true)}
                            className="h-auto gap-2.5 rounded-full border-[#6653fb] bg-white px-[30px] py-[5px] text-[#6653fb]"
                        >
                            <span
                                aria-hidden="true"
                                className="text-[22px] leading-[33px] font-normal tracking-[-0.2578px]"
                            >
                                ✦
                            </span>
                            <span className="text-[20px] leading-[30px] font-semibold tracking-[0.5px]">
                                AI 분석 보기
                            </span>
                        </Button>
                        <p className="text-center text-[16px] leading-[25px] font-normal tracking-normal text-[#83889e]">
                            AI가 시세 분석과 거래 타이밍을 종합해 알려드려요.
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
