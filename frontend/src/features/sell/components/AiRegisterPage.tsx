"use client";

import { useState, type MouseEvent } from "react";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/common/components/ui/Alert";
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
            <section className="layout-container flex flex-1 flex-col gap-[80px] py-16 pb-[120px]">
                <header className="flex flex-col gap-[30px]">
                    <Link
                        href="/sell/register"
                        className="inline-flex w-fit items-center gap-2 text-[20px] leading-[32px] font-medium tracking-[0.5px] text-[#6b7395] transition-colors hover:text-[#6653fb]"
                    >
                        <ArrowLeft aria-hidden="true" className="size-5" />
                        <span>등록 방식 선택</span>
                    </Link>
                    <div className="flex flex-col gap-2.5">
                        <p className="text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#363636]">
                            AI로 빠르게
                        </p>
                        <h1 className="text-[60px] leading-[75px] font-bold tracking-[0.5px] text-[#6653fb]">
                            상품 사진을 올려주세요
                        </h1>
                    </div>
                </header>

                <div className="flex w-full flex-col rounded-[20px] bg-white pt-10 sm:px-8 lg:h-[921px] lg:px-[60px]">
                    <div className="flex w-full flex-col gap-[30px] overflow-hidden rounded-[20px] border border-[#d3d3d3] bg-white pb-[30px]">
                        <AiImageUpload onError={setError} onFilesChange={setImages} />

                        <section className="flex min-h-[322px] w-full flex-col justify-center gap-[30px] rounded-[12px] bg-white px-6 py-[30px] lg:px-[80px]">
                            <div className="flex flex-col items-start gap-5">
                                <h2 className="text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#545d82]">
                                    <span aria-hidden="true">📌 </span>
                                    사진 촬영 팁
                                </h2>
                                <ul className="flex flex-col gap-[5px] text-[20px] leading-[32px] font-medium tracking-[0.5px] text-[#6b7395]">
                                    {[
                                        "상품 전체가 나오는 사진",
                                        "브랜드나 모델명이 보이는 사진",
                                        "흠집이나 사용 흔적이 보이는 사진",
                                    ].map((tip) => (
                                        <li key={tip} className="flex items-center gap-2">
                                            <span
                                                aria-hidden="true"
                                                className="size-1.5 shrink-0 rounded-full bg-[#5d55fe]"
                                            />
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="flex min-h-[57px] items-center justify-center rounded-[10px] bg-[#f1f1f1] px-5 py-4 text-center">
                                <p className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#363636]">
                                    AI 분석 결과는 사진을 기반으로 한 참고 정보입니다. 보이지 않는
                                    하자나 실제 작동 상태는 판매자가 직접 확인해 주세요.
                                </p>
                            </div>
                        </section>
                    </div>

                    <div className="relative flex min-h-[96px] w-full flex-1 flex-col justify-between gap-2 pb-0 sm:block">
                        {error && (
                            <Alert
                                variant="destructive"
                                className="flex w-auto max-w-full items-center gap-1.5 border-0 bg-transparent p-0 text-left shadow-none sm:absolute sm:top-4 sm:left-0"
                            >
                                <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
                                <AlertDescription className="typography-body-small text-destructive p-0 text-left">
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}
                        <Button
                            asChild
                            size="lg"
                            className="h-12 self-end rounded-full bg-[#6653fb] px-8 text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-white hover:bg-[#5745e7] sm:absolute sm:right-0 sm:bottom-0"
                        >
                            <Link
                                href="/sell/register/ai/additional-info"
                                onClick={handleAnalysisStart}
                            >
                                데모: 분석 시작
                                <ArrowRight aria-hidden="true" className="size-5" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </main>
    );
}
