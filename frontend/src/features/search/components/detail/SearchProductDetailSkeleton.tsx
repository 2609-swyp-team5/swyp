import { Skeleton } from "@/common/components/ui/Skeleton";

/** 상품 상세(이미지·상품 정보 2단)와 같은 크기로 그려 응답 후 레이아웃이 밀리지 않게 한다 */
export function SearchProductDetailSkeleton() {
    return (
        <>
            <p role="status" className="sr-only">
                상품 정보를 불러오는 중입니다.
            </p>
            <div
                aria-hidden="true"
                className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10"
            >
                <div className="flex min-w-0 flex-col gap-4">
                    <Skeleton className="h-[280px] w-full rounded-xl bg-[#dfdfdf] sm:h-[380px]" />
                    <div className="flex gap-3">
                        {[0, 1, 2].map((index) => (
                            <Skeleton key={index} className="size-20 rounded-lg" />
                        ))}
                    </div>
                </div>
                <div className="flex min-w-0 flex-col gap-[50px] lg:min-h-[523px]">
                    <div className="flex flex-col gap-[30px]">
                        <div className="flex gap-2">
                            <Skeleton className="h-7 w-20 rounded-full" />
                            <Skeleton className="h-7 w-16 rounded-full" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-[38px] w-3/4 sm:h-[42px]" />
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-[42px] w-44" />
                                <Skeleton className="h-[26px] w-32 rounded-full" />
                            </div>
                            <Skeleton className="h-[22px] w-56" />
                            <Skeleton className="h-[22px] w-40" />
                        </div>
                        <Skeleton className="h-12 w-full max-w-[295px] rounded-[50px]" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-5/6" />
                        <Skeleton className="h-6 w-2/3" />
                    </div>
                </div>
            </div>
        </>
    );
}
