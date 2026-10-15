"use client";

import type { ReactNode } from "react";

import {
    AiImageUpload,
    type AiImagePreview,
} from "@/features/sell/components/ai-register/AiImageUpload";

type AiRegisterUploadStepProps = {
    images: AiImagePreview[];
    onError: (message: string) => void;
    onImagesChange: (images: AiImagePreview[]) => void;
    children: ReactNode;
};

export function AiRegisterUploadStep({
    images,
    onError,
    onImagesChange,
    children,
}: AiRegisterUploadStepProps) {
    return (
        <div className="flex w-full flex-col">
            <div className="flex w-full flex-col gap-[30px] overflow-hidden rounded-[20px] border border-[#d3d3d3] bg-white pb-[30px]">
                <AiImageUpload images={images} onError={onError} onImagesChange={onImagesChange} />

                <section className="flex w-full flex-col justify-center gap-5 rounded-[12px] bg-white px-4 py-6 md:min-h-[322px] md:gap-[30px] md:px-6 md:py-[30px] lg:px-[80px]">
                    <div className="flex flex-col items-start gap-5">
                        <h2 className="text-[22px] leading-8 font-bold tracking-[0.5px] text-[#545d82] md:text-[30px] md:leading-[42px]">
                            <span aria-hidden="true">📌 </span>
                            사진 촬영 팁
                        </h2>
                        <ul className="flex flex-col gap-[5px] text-[16px] leading-[26px] font-medium tracking-[0.5px] text-[#6b7395] md:text-[20px] md:leading-[32px]">
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
                        <p className="text-[14px] leading-[22px] font-semibold tracking-[0.5px] break-keep text-[#363636] md:text-[16px] md:leading-[25px]">
                            AI 분석 결과는 사진을 기반으로 한 참고 정보입니다. 보이지 않는 하자나
                            실제 작동 상태는 판매자가 직접 확인해 주세요.
                        </p>
                    </div>
                </section>
            </div>

            {children}
        </div>
    );
}
