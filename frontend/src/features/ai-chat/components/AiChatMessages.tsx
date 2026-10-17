"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Copy, PencilLine, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";

import { cn } from "@/common/lib/utils";
import { isOptimizableImageUrl } from "@/common/lib/image/optimizableImage";
import { ProfileAvatar } from "@/features/member/components/ProfileAvatar";
import { useMeQuery } from "@/features/member/hooks/queries/useMeQuery";

import type { AiChatLiveAnswer } from "../hooks/mutations/useSendAiChatMutation";
import { useAiChatCardAnalysisQuery } from "../hooks/queries/useAiChatCardAnalysisQuery";
import type {
    AiChatAnalysisCard as AnalysisCardData,
    AiChatMessage,
    AiChatRecommendedProduct,
} from "../schemas/aiChatSchema";
import {
    analysisCardHref,
    formatChatTime,
    priceDiffText,
    recommendationHeadline,
    recommendedProductHref,
} from "../utils/aiChatDisplay";

const bubbleBackground =
    "bg-[linear-gradient(50.8deg,rgb(246,246,255)_2.7%,rgb(226,223,250)_97.3%)]";

export function AiIcon({ className }: { className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-b from-[#6653fb] to-[#b1a9ef] text-white md:size-10",
                className,
            )}
        >
            <Sparkles className="size-5" />
        </span>
    );
}

export function UserBubble({ text }: { text: string }) {
    // 헤더와 같은 내 정보 캐시로 프로필 사진을 보여 준다(없으면 기본 실루엣)
    const { data: member } = useMeQuery();

    return (
        <div className="flex items-start justify-end gap-2.5">
            <p className="typography-body-medium max-w-[85%] rounded-[10px] border border-[#d3d3d3] bg-white px-4 py-3 break-words whitespace-pre-wrap text-black md:max-w-[602px] md:p-5">
                {text}
            </p>
            <span className="hidden shrink-0 md:block">
                <ProfileAvatar src={member?.profileImageUrl} size="header" />
            </span>
        </div>
    );
}

/** 답변 스트림을 받는 동안의 말풍선 — 진행 단계(n/3) → 카드(찾기 완료 시) → 문장 조각을 오는 대로 그린다. */
export function StreamingBubble({ live }: { live: AiChatLiveAnswer }) {
    const card = live.result?.analysis ?? null;
    const products = live.result?.recommendedProducts ?? [];

    return (
        <div className="flex items-start gap-2.5" aria-live="polite">
            <AiIcon />
            <div
                className={cn(
                    "flex w-full max-w-[602px] min-w-0 flex-col gap-5 rounded-[10px] p-4 md:gap-[30px] md:p-5",
                    bubbleBackground,
                )}
            >
                {live.text ? (
                    <p className="typography-body-medium whitespace-pre-line text-black">
                        {live.text}
                        <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-[#6653fb] align-middle" />
                    </p>
                ) : (
                    <p role="status" className="typography-body-medium text-[#6b7395]">
                        {live.stepText ?? "질문을 보내는 중이에요…"}
                    </p>
                )}
                {card || products.length > 0 ? (
                    <div className="flex flex-col gap-2.5">
                        {card ? <AnalysisCard card={card} /> : null}
                        {products.length > 0 ? <ProductCarousel products={products} /> : null}
                    </div>
                ) : null}
                {live.text && live.stepText ? (
                    <p className="typography-caption text-[#a9adbd]">{live.stepText}</p>
                ) : null}
            </div>
        </div>
    );
}

export function AssistantBubble({
    message,
    disabled,
    editing,
    onRegenerate,
    onEdit,
}: {
    message: AiChatMessage;
    disabled: boolean;
    editing: boolean;
    onRegenerate: () => void;
    onEdit: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const card = message.analysis;
    const products = message.recommendedProducts;
    const actionClassName =
        "flex size-8 items-center justify-center rounded-md text-[#83889e] transition-colors hover:bg-white/70 hover:text-[#6653fb] disabled:opacity-40";

    return (
        <div className="flex items-start gap-2.5">
            <AiIcon />
            <div className="flex w-full max-w-[602px] min-w-0 flex-col items-end gap-1.5">
                <div
                    className={cn(
                        "flex w-full flex-col gap-6 rounded-[10px] p-4 md:gap-[50px] md:p-5",
                        bubbleBackground,
                    )}
                >
                    <p className="typography-body-medium whitespace-pre-line text-black">
                        {message.content}
                    </p>
                    {card || products.length > 0 ? (
                        <div className="flex flex-col gap-2.5">
                            {card ? (
                                <div className="flex flex-col gap-2.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="typography-body-bold-small flex items-center gap-[5px] text-[#363636]">
                                            <Sparkles aria-hidden="true" className="size-3" />
                                            상세 시세 분석 보기
                                        </span>
                                        <Link
                                            href={analysisCardHref(card)}
                                            className="typography-body-small flex items-center gap-0.5 text-[#83889e] hover:text-[#6653fb]"
                                        >
                                            더보기
                                            <ChevronRight aria-hidden="true" className="size-3" />
                                        </Link>
                                    </div>
                                    <AnalysisCard card={card} />
                                </div>
                            ) : null}
                            {products.length > 0 ? <ProductCarousel products={products} /> : null}
                        </div>
                    ) : null}
                </div>
                <div className="flex w-full items-center justify-between px-1">
                    <span className="typography-body-small text-[#83889e]">
                        {copied ? "복사했어요" : formatChatTime(message.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                        <button
                            type="button"
                            aria-label="답변 복사"
                            className={actionClassName}
                            onClick={() => {
                                void navigator.clipboard?.writeText(message.content).then(() => {
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 1500);
                                });
                            }}
                        >
                            <Copy aria-hidden="true" className="size-4" />
                        </button>
                        <button
                            type="button"
                            aria-label="답변 다시 만들기"
                            disabled={disabled}
                            className={actionClassName}
                            onClick={onRegenerate}
                        >
                            <RefreshCw aria-hidden="true" className="size-4" />
                        </button>
                        <button
                            type="button"
                            aria-label="질문 수정"
                            aria-pressed={editing}
                            disabled={disabled}
                            className={cn(actionClassName, editing && "bg-white text-[#6653fb]")}
                            onClick={onEdit}
                        >
                            <PencilLine aria-hidden="true" className="size-4" />
                        </button>
                    </span>
                </div>
            </div>
        </div>
    );
}

/** 상세 시세 분석 카드 — 분석 중이면 결과 스트림이 끝날 때 판단과 근거를 채운다. */
export function AnalysisCard({ card }: { card: AnalysisCardData }) {
    const live = useAiChatCardAnalysisQuery(card);
    const liveAnalysis = live.data?.analysis ?? null;
    const recommendation = card.recommendation ?? liveAnalysis?.recommendation ?? null;
    const reason =
        card.recommendation === null && liveAnalysis
            ? (liveAnalysis.description.match(/^[^.!?]*[.!?]/)?.[0] ?? liveAnalysis.description)
            : card.recommendation === null && live.data && !liveAnalysis
              ? live.data.message
              : card.reason;
    const badgeLabel =
        recommendation ??
        (card.analysisStatus === "ANALYZING" && !live.isError ? "분석 중" : "분석 전");

    return (
        <div className="flex items-start gap-3 rounded-[10px] bg-white px-4 py-3 md:px-5 md:py-4">
            <span
                className={cn(
                    "typography-body-bold-small flex h-5 shrink-0 items-center rounded-full px-2.5 whitespace-nowrap text-white",
                    recommendation === "SELL" || recommendation === "BUY"
                        ? "bg-[#6653fb]"
                        : recommendation
                          ? "bg-[#272727]"
                          : "bg-[#b1a9ef]",
                )}
            >
                {badgeLabel}
            </span>
            <span className="flex min-w-0 flex-col">
                <span className="typography-body-bold break-keep text-[#545d82]">
                    {card.title}
                    {recommendation ? ` — ${recommendationHeadline[recommendation]}` : ""}
                </span>
                <span className="typography-body-small pt-0.5 text-[#6b7395]">{reason}</span>
            </span>
        </div>
    );
}

const pageSize = 3;

/** 추천 상품 — 휴대폰은 가로로 밀어서 보고, 태블릿·데스크톱은 3개씩 넘긴다. */
export function ProductCarousel({ products }: { products: AiChatRecommendedProduct[] }) {
    const [page, setPage] = useState(0);
    const pageCount = Math.ceil(products.length / pageSize);
    const visible = products.slice(page * pageSize, page * pageSize + pageSize);
    const arrowClassName =
        "flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-[#545d82] shadow-sm disabled:opacity-40";

    return (
        <div className="flex flex-col gap-3 py-2.5">
            <p className="typography-body-bold-small text-[#464646]">추천 상품</p>
            <ul
                aria-label="추천 상품 목록"
                className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 md:hidden"
            >
                {products.map((product) => (
                    <li
                        key={`${product.source}-${product.id}`}
                        className="w-[44%] shrink-0 snap-start"
                    >
                        <ProductCard product={product} />
                    </li>
                ))}
            </ul>
            <div className="hidden flex-col items-center gap-[30px] md:flex">
                <div className="flex w-full items-center gap-2.5">
                    <button
                        type="button"
                        aria-label="이전 추천 상품"
                        disabled={page === 0}
                        onClick={() => setPage((value) => value - 1)}
                        className={arrowClassName}
                    >
                        <ChevronLeft aria-hidden="true" className="size-4" />
                    </button>
                    <div className="grid min-w-0 flex-1 grid-cols-3 gap-[5px]">
                        {visible.map((product) => (
                            <ProductCard
                                key={`${product.source}-${product.id}`}
                                product={product}
                            />
                        ))}
                    </div>
                    <button
                        type="button"
                        aria-label="다음 추천 상품"
                        disabled={page >= pageCount - 1}
                        onClick={() => setPage((value) => value + 1)}
                        className={arrowClassName}
                    >
                        <ChevronRight aria-hidden="true" className="size-4" />
                    </button>
                </div>
                {pageCount > 1 ? (
                    <div className="flex gap-2.5">
                        {Array.from({ length: pageCount }, (_, index) => (
                            <button
                                key={index}
                                type="button"
                                aria-label={`추천 상품 ${index + 1}번째 묶음`}
                                aria-current={index === page ? "true" : undefined}
                                onClick={() => setPage(index)}
                                className={cn(
                                    "size-2.5 rounded-full",
                                    index === page ? "bg-[#83889e]" : "bg-white",
                                )}
                            />
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function ProductCard({ product }: { product: AiChatRecommendedProduct }) {
    return (
        <Link
            href={recommendedProductHref(product)}
            className="flex h-full min-w-0 flex-col overflow-hidden rounded-[8px] bg-white shadow-[0px_0px_4px_0px_rgba(0,0,0,0.1)]"
        >
            <span className="relative block aspect-[4/3] bg-[#d3d3d3]">
                {product.imageUrl ? (
                    <Image
                        src={product.imageUrl}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 180px, 45vw"
                        className="object-cover"
                        unoptimized={!isOptimizableImageUrl(product.imageUrl)}
                    />
                ) : null}
                <span className="typography-caption absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-white">
                    {product.platformName}
                </span>
            </span>
            <span className="flex flex-col gap-1.5 p-2.5">
                <span className="typography-body-bold-small truncate text-black">
                    {product.title}
                </span>
                {product.averagePrice ? (
                    <span className="typography-body-small text-[#fa503d]">
                        평균가{" "}
                        <span className="line-through">
                            {product.averagePrice.toLocaleString("ko-KR")}원
                        </span>
                    </span>
                ) : null}
                <span className="typography-heading-03 font-bold whitespace-nowrap text-[#464646]">
                    {product.price.toLocaleString("ko-KR")}원
                </span>
                <span className="typography-caption text-[#363636]">
                    = {priceDiffText(product.priceDiffRate)}
                </span>
            </span>
        </Link>
    );
}
