function ManagementProductSummarySkeleton() {
    return (
        <section
            aria-label="상품 정보를 불러오는 중"
            className="w-full overflow-hidden rounded-[20px] border border-[#d3d3d3] bg-white"
        >
            <div className="grid min-h-[442px] gap-10 p-[30px] lg:h-[442px] lg:grid-cols-[310px_minmax(0,1fr)]">
                <div className="flex min-w-0 flex-col gap-5">
                    <div className="aspect-[310/292] w-full animate-pulse rounded-[10px] bg-[#eef0f5]" />
                    <div className="grid h-[70px] animate-pulse grid-cols-4 gap-2.5">
                        {Array.from({ length: 4 }, (_, index) => (
                            <div key={index} className="rounded-lg bg-[#f4f5f8]" />
                        ))}
                    </div>
                </div>
                <div className="flex min-w-0 animate-pulse flex-col">
                    <div className="flex items-center gap-3">
                        <div className="h-6 w-20 rounded-full bg-[#eef0f5]" />
                        <div className="h-4 w-32 rounded bg-[#f4f5f8]" />
                    </div>
                    <div className="mt-1 h-10 w-4/5 rounded bg-[#eef0f5]" />
                    <div className="h-[30px] w-2/5 rounded bg-[#f4f5f8]" />

                    <div className="mt-[30px] grid grid-cols-2 gap-x-[30px] gap-y-[10px]">
                        {Array.from({ length: 4 }, (_, index) => (
                            <div key={index} className="flex items-center gap-4">
                                <div className="h-5 w-12 rounded bg-[#f4f5f8]" />
                                <div className="h-5 w-16 rounded bg-[#eef0f5]" />
                            </div>
                        ))}
                    </div>

                    <div className="my-5 h-px w-full bg-[#d3d3d3]" />
                    <div className="flex flex-col gap-2">
                        <div className="h-5 w-16 rounded bg-[#f4f5f8]" />
                        <div className="h-5 w-full rounded bg-[#eef0f5]" />
                        <div className="h-5 w-4/5 rounded bg-[#f4f5f8]" />
                    </div>

                    <div className="mt-auto flex items-end justify-end gap-5 pt-4">
                        {Array.from({ length: 3 }, (_, index) => (
                            <div key={index} className="flex w-[52px] flex-col items-center gap-1">
                                <div className="size-5 rounded bg-[#eef0f5]" />
                                <div className="h-[18px] w-full rounded bg-[#f4f5f8]" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid h-[96px] grid-cols-[1fr_1px_1fr_1px_1fr] border-t border-[#d3d3d3] bg-[#fafbff]">
                <div className="flex animate-pulse flex-col items-center justify-center gap-1">
                    <div className="h-5 w-16 rounded bg-[#f4f5f8]" />
                    <div className="h-[30px] w-20 rounded bg-[#eef0f5]" />
                </div>
                <div className="my-auto h-[54px] w-px bg-[#d3d3d3]" />
                <div className="flex animate-pulse flex-col items-center justify-center gap-1">
                    <div className="h-5 w-10 rounded bg-[#f4f5f8]" />
                    <div className="h-[30px] w-12 rounded bg-[#eef0f5]" />
                </div>
                <div className="my-auto h-[54px] w-px bg-[#d3d3d3]" />
                <div className="flex animate-pulse flex-col items-center justify-center gap-1">
                    <div className="h-5 w-10 rounded bg-[#f4f5f8]" />
                    <div className="h-[30px] w-12 rounded bg-[#eef0f5]" />
                </div>
            </div>
        </section>
    );
}

export function ProductSummarySkeleton() {
    return <ManagementProductSummarySkeleton />;
}
