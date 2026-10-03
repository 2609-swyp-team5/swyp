export function ProductPriceTrendSkeleton() {
    return (
        <div className="flex flex-col gap-[10px]" aria-label="가격 변화 추이 데이터를 불러오는 중">
            <div className="h-[25px] w-28 animate-pulse rounded bg-[#eef0f5]" />
            <div className="h-[363px] rounded-[10px] border border-[#d3d3d3] bg-white px-5 py-[22px]">
                <div className="animate-pulse">
                    <div className="flex items-center justify-between gap-3 px-1">
                        <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full bg-[#eef0f5]" />
                            <div className="h-[25px] w-36 rounded bg-[#eef0f5]" />
                            <div className="h-[15px] w-32 rounded bg-[#f4f5f8]" />
                        </div>
                        <div className="h-[18px] w-32 rounded bg-[#eef0f5]" />
                    </div>
                    <div className="mt-2 h-[258px]">
                        <div className="flex h-[222px] gap-2">
                            <div className="flex w-[42px] shrink-0 flex-col justify-between py-1">
                                {[0, 1, 2, 3, 4].map((index) => (
                                    <div key={index} className="h-3 w-8 rounded bg-[#f4f5f8]" />
                                ))}
                            </div>
                            <div className="relative flex min-w-0 flex-1 flex-col justify-between py-1">
                                <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#f4f5f8] to-transparent" />
                                {[0, 1, 2, 3, 4].map((index) => (
                                    <div key={index} className="relative h-px bg-[#eef0f5]" />
                                ))}
                            </div>
                        </div>
                        <div className="mt-3 flex justify-between pl-[42px]">
                            {[0, 1, 2, 3].map((index) => (
                                <div key={index} className="h-3 w-7 rounded bg-[#f4f5f8]" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
