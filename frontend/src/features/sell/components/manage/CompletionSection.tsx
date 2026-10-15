"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/common/components/ui/Button";

type CompletionSectionProps = {
    isUpdated?: boolean;
    isDetailView?: boolean;
};

export function CompletionSection({
    isUpdated = false,
    isDetailView = false,
}: CompletionSectionProps) {
    const router = useRouter();
    const title = isDetailView
        ? "등록한 판매글을 확인해보세요!"
        : isUpdated
          ? "상품 수정이 완료되었어요!"
          : "상품 등록이 완료되었어요!";
    const description = isDetailView
        ? "등록된 판매글의 상세 정보와 판매 현황을 확인할 수 있어요."
        : isUpdated
          ? "수정한 판매글이 정상적으로 등록되었습니다."
          : "작성한 판매글이 정상적으로 등록되었습니다.";

    return (
        <section
            aria-labelledby="completion-title"
            className="flex items-center overflow-hidden rounded-[20px] bg-[#fafbff] px-5 py-6 md:h-[360px] md:min-h-[280px] md:px-8 md:py-0 md:pl-12 lg:justify-between lg:pl-20"
        >
            <div className="relative z-10 md:py-8">
                <h2
                    id="completion-title"
                    className="text-[22px] leading-8 font-bold tracking-[0.5px] break-keep text-[#363636] md:text-[30px] md:leading-[42px]"
                >
                    {title}
                </h2>
                <p className="mt-2 text-[14px] leading-[22px] font-normal break-keep text-[#464646] md:text-[16px] md:leading-[25px]">
                    {description}
                    {!isDetailView ? (
                        <>
                            <br />
                            이제 판매 현황을 확인하거나 다른 플랫폼에도 등록해보세요.
                        </>
                    ) : null}
                </p>
                <Button
                    type="button"
                    onClick={() => router.push("/sell/manage")}
                    className="mt-4 h-auto rounded-full border border-[#6653fb] bg-white px-4 py-2 text-[16px] leading-6 font-semibold tracking-[0.5px] text-[#6653fb] hover:bg-[#f5f3ff] hover:text-[#5745e7] md:px-5 md:py-2.5 md:text-[20px] md:leading-[30px]"
                >
                    판매 상품 목록 보기
                    <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
            </div>
            <div className="relative hidden h-[604px] w-[557px] shrink-0 lg:block">
                <Image
                    src="/sell/completion-illustration.png"
                    alt={
                        isDetailView
                            ? "판매글 확인 일러스트"
                            : `${isUpdated ? "상품 수정" : "상품 등록"} 완료 일러스트`
                    }
                    fill
                    priority
                    className="object-cover"
                    sizes="557px"
                />
            </div>
        </section>
    );
}
