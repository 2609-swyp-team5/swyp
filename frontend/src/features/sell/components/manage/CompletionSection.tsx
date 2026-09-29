import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { Button } from "@/common/components/ui/Button";

export function CompletionSection({ isUpdated = false }: { isUpdated?: boolean }) {
    const title = isUpdated ? "상품 수정이 완료되었어요!" : "상품 등록이 완료되었어요!";
    const description = isUpdated
        ? "수정한 판매글이 정상적으로 등록되었습니다."
        : "작성한 판매글이 정상적으로 등록되었습니다.";

    return (
        <section
            aria-labelledby="completion-title"
            className="flex min-h-[280px] items-center overflow-hidden rounded-[20px] bg-[#fafbff] px-8 py-10 md:h-[360px] md:py-0 md:pl-12 lg:justify-between lg:pl-20"
        >
            <div className="relative z-10 py-5 md:py-8">
                <h2
                    id="completion-title"
                    className="text-[28px] leading-[42px] font-bold tracking-[0.5px] text-[#363636] md:text-[30px]"
                >
                    {title}
                </h2>
                <p className="mt-2 text-[16px] leading-[25px] font-normal text-[#464646]">
                    {description}
                    <br />
                    이제 판매 현황을 확인하거나 다른 플랫폼에도 등록해보세요.
                </p>
                <Button
                    type="button"
                    className="mt-4 h-auto rounded-full border border-[#6653fb] bg-white px-5 py-2.5 text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#6653fb] hover:bg-[#f5f3ff] hover:text-[#5745e7]"
                >
                    판매 상품 관리로 이동
                    <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
            </div>
            <div className="relative hidden h-[604px] w-[557px] shrink-0 lg:block">
                <Image
                    src="/sell/completion-illustration.png"
                    alt={`${isUpdated ? "상품 수정" : "상품 등록"} 완료 일러스트`}
                    fill
                    priority
                    className="object-cover"
                    sizes="557px"
                />
            </div>
        </section>
    );
}
