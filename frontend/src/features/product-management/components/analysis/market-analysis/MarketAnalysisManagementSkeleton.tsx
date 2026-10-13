export function MarketAnalysisManagementSkeleton() {
    return (
        <div aria-label="AI 시세 분석을 불러오는 중" className="bg-white">
            <div className="px-[30px] pb-5">
                <div className="rounded-[10px] bg-[#fafbff] px-[30px] py-5">
                    <div className="grid min-h-[183px] gap-2.5 lg:grid-cols-[minmax(0,1fr)_198px]">
                        <div className="flex min-w-0 animate-pulse flex-col justify-center gap-[13px] py-5">
                            <div className="h-[36px] w-20 rounded-full bg-[#eef0f5]" />
                            <div className="flex flex-col gap-2.5">
                                <div className="h-[30px] w-4/5 rounded bg-[#eef0f5]" />
                                <div className="h-5 w-full rounded bg-[#f4f5f8]" />
                                <div className="h-5 w-4/5 rounded bg-[#f4f5f8]" />
                            </div>
                        </div>
                        <div className="flex items-center justify-center">
                            <div className="size-[150px] animate-pulse rounded-full bg-[#eef0f5] lg:size-[183px]" />
                        </div>
                    </div>

                    <div className="mt-5 flex flex-col items-end gap-[10px]">
                        <div className="grid min-h-[101px] w-full animate-pulse grid-cols-[1fr_1px_1fr_1px_1fr] rounded-[10px] border border-[#d3d3d3] bg-white px-[10px] py-5">
                            <div className="flex flex-col items-center justify-center gap-1">
                                <div className="h-5 w-20 rounded bg-[#f4f5f8]" />
                                <div className="h-[30px] w-24 rounded bg-[#eef0f5]" />
                                <div className="h-[15px] w-20 rounded bg-[#f4f5f8]" />
                            </div>
                            <div className="my-auto h-[52px] w-px bg-[#d3d3d3]" />
                            <div className="flex flex-col items-center justify-center gap-1">
                                <div className="h-5 w-20 rounded bg-[#f4f5f8]" />
                                <div className="h-[30px] w-24 rounded bg-[#eef0f5]" />
                            </div>
                            <div className="my-auto h-[52px] w-px bg-[#d3d3d3]" />
                            <div className="flex flex-col items-center justify-center gap-1">
                                <div className="h-5 w-24 rounded bg-[#f4f5f8]" />
                                <div className="h-[30px] w-24 rounded bg-[#eef0f5]" />
                            </div>
                        </div>
                        <div className="h-5 w-32 animate-pulse rounded bg-[#f4f5f8]" />
                    </div>
                </div>
            </div>

            <div className="border-t border-[#d3d3d3] px-[50px] py-[30px]">
                <div className="flex animate-pulse items-start justify-between gap-5">
                    <div className="flex min-w-0 flex-col gap-2.5">
                        <div className="h-[30px] w-56 rounded bg-[#eef0f5]" />
                        <div className="h-5 w-full max-w-[520px] rounded bg-[#f4f5f8]" />
                    </div>
                    <div className="h-5 w-20 shrink-0 rounded bg-[#f4f5f8]" />
                </div>
            </div>
        </div>
    );
}
