"use client";

import { useState, type MouseEvent } from "react";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Pin } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { AiImageUpload } from "@/features/sell/components/AiImageUpload";

export function AiRegisterPage() {
    const [images, setImages] = useState<File[]>([]);
    const [error, setError] = useState("");

    const handleAnalysisStart = (event: MouseEvent<HTMLAnchorElement>) => {
        if (images.length === 0) {
            event.preventDefault();
            setError("상품 사진을 1장 이상 업로드해주세요.");
        }
    };

    return (
        <main className="flex flex-1 flex-col bg-white">
            <section className="layout-container flex flex-1 flex-col gap-[50px] py-16 pb-[120px]">
                <header className="flex flex-col gap-[30px]">
                    <Link
                        href="/sell/register"
                        className="typography-body-medium inline-flex w-fit items-center gap-2 text-[#6b7395] transition-colors hover:text-[#6653fb]"
                    >
                        <ArrowLeft aria-hidden="true" className="size-5" />
                        <span>등록 방식 선택</span>
                    </Link>
                    <div className="flex flex-col gap-2.5">
                        <p className="typography-heading-03 text-[#363636]">AI로 빠르게</p>
                        <h1 className="typography-heading-01 text-[#6653fb]">
                            상품 사진을 올려주세요
                        </h1>
                    </div>
                </header>

                <div className="flex flex-col items-end gap-[60px]">
                    <div className="flex w-full flex-col gap-[30px] lg:h-[722px] lg:px-[120px]">
                        <AiImageUpload error={error} onError={setError} onFilesChange={setImages} />

                        <section className="flex min-h-[322px] flex-col justify-center gap-[30px] rounded-xl bg-white px-6 py-6 shadow-[0_4px_5px_rgba(0,0,0,0.1)] lg:h-[322px] lg:px-[50px]">
                            <div className="flex flex-col items-start gap-5">
                                <h2 className="typography-heading-03 flex items-center gap-2 text-[#545d82]">
                                    <Pin
                                        aria-hidden="true"
                                        className="size-6"
                                        fill="currentColor"
                                    />
                                    사진 촬영 팁
                                </h2>
                                <ul className="flex flex-col gap-[5px]">
                                    {[
                                        "상품 전체가 나오는 사진",
                                        "브랜드나 모델명이 보이는 사진",
                                        "흠집이나 사용 흔적이 보이는 사진",
                                    ].map((tip) => (
                                        <li
                                            key={tip}
                                            className="typography-body-medium flex items-center gap-2 text-[#6b7395]"
                                        >
                                            <span
                                                aria-hidden="true"
                                                className="size-1.5 shrink-0 rounded-full bg-[#5d55fe]"
                                            />
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="flex min-h-[57px] items-center justify-center rounded-[10px] bg-[#e5eafc] px-5 py-4 text-center">
                                <p className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#363636]">
                                    AI 분석 결과는 사진을 기반으로 한 참고 정보입니다. 보이지 않는
                                    하자나 실제 작동 상태는 판매자가 직접 확인해 주세요.
                                </p>
                            </div>
                        </section>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        {error && (
                            <p className="sr-only" aria-live="polite">
                                {error}
                            </p>
                        )}
                        <Button
                            asChild
                            size="lg"
                            className="h-12 rounded-full bg-[#6653fb] px-8 text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-white hover:bg-[#5745e7]"
                        >
                            <Link
                                href="/sell/register/ai/additional-info"
                                onClick={handleAnalysisStart}
                            >
                                분석 시작
                                <ArrowRight aria-hidden="true" className="size-5" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </main>
    );
}
