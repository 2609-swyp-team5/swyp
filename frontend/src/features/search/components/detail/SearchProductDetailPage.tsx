"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Heart, Info } from "lucide-react";

import { Badge } from "@/common/components/ui/Badge";
import { Button } from "@/common/components/ui/Button";
import { cn } from "@/common/lib/utils";

export function SearchProductDetailPage() {
    const [selectedImage, setSelectedImage] = useState(0);
    const [liked, setLiked] = useState(false);

    return (
        <main className="flex-1 bg-white text-[#363636]">
            <div className="layout-container flex flex-col gap-[30px] py-10 lg:py-20">
                <Link
                    href="/search"
                    className="self-start text-[20px] leading-8 font-medium tracking-[0.5px] text-[#6b7395] hover:text-[#6653fb]"
                >
                    ← 이전 페이지
                </Link>

                <div>
                    <p className="mb-6 flex items-start gap-[5px] text-[12px] leading-5 tracking-[-0.5px] text-[#272727]">
                        <Info
                            aria-hidden="true"
                            strokeWidth={1.5}
                            className="mt-0.5 size-[15px] shrink-0"
                        />
                        <span>
                            이 상품 정보는 3시간 전에 확인되었습니다. 외부 플랫폼에서 최신 상태를
                            확인해 주세요.
                        </span>
                    </p>

                    <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
                        <section aria-label="상품 이미지" className="flex min-w-0 flex-col gap-4">
                            <div
                                role="img"
                                aria-label={`상품 이미지 ${selectedImage + 1} 자리`}
                                className="h-[280px] w-full rounded-xl border border-[#fafbff] bg-[#d3d3d3] sm:h-[380px]"
                            />
                            <div className="flex gap-3" role="group" aria-label="상품 이미지 선택">
                                {[0, 1, 2].map((index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        aria-label={`상품 이미지 ${index + 1}`}
                                        aria-pressed={selectedImage === index}
                                        onClick={() => setSelectedImage(index)}
                                        className={cn(
                                            "size-20 shrink-0 cursor-pointer rounded-lg border-2 bg-[#d3d3d3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6653fb]",
                                            selectedImage === index
                                                ? "border-[#6653fb]"
                                                : "border-[#fafbff]",
                                        )}
                                    />
                                ))}
                            </div>
                        </section>

                        <section
                            aria-label="상품 정보"
                            className="flex min-w-0 flex-col gap-[50px] lg:min-h-[523px]"
                        >
                            <div className="flex flex-col gap-[30px]">
                                <div className="flex gap-2">
                                    <Badge className="h-auto rounded-full border-0 bg-[#ff6f0f] px-3 py-1 text-[13px] leading-5 font-semibold tracking-[-0.5px] text-white">
                                        당근마켓
                                    </Badge>
                                    <Badge className="h-auto rounded-full border-0 bg-[#fafbff] px-3 py-1 text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#6653fb]">
                                        판매중
                                    </Badge>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <h1 className="text-[26px] leading-[38px] font-bold tracking-[0.5px] break-words sm:text-[30px] sm:leading-[42px]">
                                        아이폰 13 미니 128GB 미드나이트
                                    </h1>
                                    <div className="flex flex-wrap items-center">
                                        <p className="text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#fa503d]">
                                            345,000원
                                        </p>
                                        <Badge className="font-brand h-auto rounded-full border-0 bg-[#fafbff] px-2.5 py-1 text-[12px] leading-[18px] font-semibold text-[#6653fb]">
                                            ↓ 평균보다 5% 낮아요
                                        </Badge>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    aria-pressed={liked}
                                    onClick={() => setLiked((current) => !current)}
                                    className="font-brand h-12 w-full max-w-[295px] rounded-[50px] border-[1.5px] border-[#d3d3d3] bg-white text-[16px] leading-6 font-semibold text-[#363636] hover:bg-[#fafbff]"
                                >
                                    <Heart
                                        aria-hidden="true"
                                        className={cn("size-4", liked && "text-[#fa503d]")}
                                        fill={liked ? "currentColor" : "none"}
                                    />
                                    {liked ? "관심상품에 추가됨" : "관심상품에 추가"}
                                </Button>
                            </div>

                            <div className="flex flex-col gap-5 rounded-xl border border-[#fafbff] bg-[#fafbff] px-[30px] py-4 text-[#83889e]">
                                <div className="flex flex-col gap-2.5">
                                    <h2 className="flex items-center gap-2 text-[16px] leading-[25px] font-semibold tracking-[0.5px]">
                                        <ExternalLink
                                            aria-hidden="true"
                                            strokeWidth={1.5}
                                            className="size-6 shrink-0"
                                        />
                                        당근마켓 판매글 이동
                                    </h2>
                                    <p className="text-[16px] leading-[25px] tracking-normal">
                                        외부 사이트에서 판매자의 상세 설명과
                                        <br className="hidden sm:block" /> 구매 조건을 확인할 수
                                        있습니다.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    disabled
                                    title="판매글 링크는 API 연결 후 제공됩니다."
                                    className="h-[52px] w-full rounded-md bg-[#83889e] text-[16px] leading-6 font-semibold text-white disabled:opacity-100"
                                >
                                    판매글 바로가기
                                </Button>
                            </div>
                        </section>
                    </div>
                </div>

                <div className="flex justify-end border-t border-[#d3d3d3] px-2.5 py-[50px]">
                    <Button
                        type="button"
                        variant="outline"
                        disabled
                        title="AI 분석은 API 연결 후 제공됩니다."
                        className="h-11 gap-2 rounded-full border-[#6653fb] bg-white px-5 text-[#6653fb] disabled:opacity-100"
                    >
                        <span aria-hidden="true" className="text-[18px] leading-7">
                            ✦
                        </span>
                        <span className="text-[18px] leading-7 font-semibold tracking-[0.5px]">
                            AI 분석 보기
                        </span>
                    </Button>
                </div>
            </div>
        </main>
    );
}
