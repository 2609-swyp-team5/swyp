import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/common/components/ui/Button";
import type { ProductPlatform } from "@/features/sell/types";
import { PlatformPublishDialog } from "./PlatformPublishDialog";

type NextActionsProps = {
    productId: number;
    existingPlatforms: ProductPlatform[];
};

export function NextActions({ productId, existingPlatforms }: NextActionsProps) {
    const router = useRouter();

    return (
        <section aria-labelledby="next-actions-title">
            <h2 id="next-actions-title" className="text-[22px] leading-8 font-bold text-[#161632]">
                다음에 할 수 있는 것
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
                <PlatformPublishDialog productId={productId} existingPlatforms={existingPlatforms}>
                    <Button
                        type="button"
                        aria-label="다른 플랫폼에 등록하기"
                        variant="outline"
                        className="h-auto w-full justify-between rounded-[10px] border-[#d3d3d3] bg-[#fafbff] p-5 text-left hover:bg-[#f5f3ff]"
                    >
                        <span className="flex min-w-0 items-center gap-4">
                            <Image src="/sell/price-bars.svg" alt="" width={54} height={54} />
                            <span>
                                <span className="block text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-black">
                                    다른 플랫폼에 등록하기
                                </span>
                                <span className="mt-0.5 block text-[16px] leading-[25px] font-normal text-[#6b6c7b]">
                                    선택한 플랫폼에 판매글을 등록할 수 있어요.
                                </span>
                            </span>
                        </span>
                        <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-[#6653fb]" />
                    </Button>
                </PlatformPublishDialog>
                <Button
                    type="button"
                    aria-label="새 상품 등록하기"
                    variant="outline"
                    className="h-auto justify-between rounded-[10px] border-[#d3d3d3] bg-[#fafbff] p-5 text-left hover:bg-[#f5f3ff]"
                    onClick={() => router.push("/sell/register")}
                >
                    <span className="flex min-w-0 items-center gap-4">
                        <Image src="/sell/new-product.svg" alt="" width={54} height={54} />
                        <span>
                            <span className="block text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-black">
                                새 상품 등록하기
                            </span>
                            <span className="mt-0.5 block text-[16px] leading-[25px] font-normal text-[#6b6c7b]">
                                다른 상품도 빠르게 등록해 보세요.
                            </span>
                        </span>
                    </span>
                    <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-[#6653fb]" />
                </Button>
            </div>
        </section>
    );
}
