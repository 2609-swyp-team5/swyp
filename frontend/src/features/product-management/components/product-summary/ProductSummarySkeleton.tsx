export function ProductSummarySkeleton() {
    return (
        <section
            aria-label="상품 정보를 불러오는 중"
            className="grid min-h-[430px] animate-pulse gap-6 rounded-[16px] border border-[#dee5ed] bg-white p-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
        >
            <div className="flex min-w-0 flex-col gap-3">
                <div className="aspect-[1.15] w-full rounded-[10px] bg-[#eef0f5]" />
                <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 4 }, (_, index) => (
                        <div key={index} className="aspect-square rounded-lg bg-[#f4f5f8]" />
                    ))}
                </div>
            </div>
            <div className="flex h-full min-w-0 flex-col gap-4 py-1">
                <div className="h-6 w-24 rounded-full bg-[#eef0f5]" />
                <div className="h-8 w-4/5 rounded bg-[#eef0f5]" />
                <div className="h-8 w-2/5 rounded bg-[#eef0f5]" />
                <div className="mt-3 flex gap-2.5">
                    <div className="h-9 w-28 rounded-full bg-[#f4f5f8]" />
                    <div className="h-9 w-24 rounded-full bg-[#f4f5f8]" />
                </div>
                <div className="mt-auto flex items-end justify-end gap-[30px] pt-6">
                    {Array.from({ length: 3 }, (_, index) => (
                        <div key={index} className="flex flex-col items-center gap-2">
                            <div className="size-10 rounded-full bg-[#eef0f5]" />
                            <div className="h-4 w-14 rounded bg-[#f4f5f8]" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
