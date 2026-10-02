export function ProductCompetitionSkeleton() {
    return (
        <div aria-label="경쟁 상품 데이터를 불러오는 중" className="animate-pulse px-10 py-5">
            <div className="flex items-center justify-between gap-4">
                <div className="h-5 w-24 rounded bg-[#eef0f5]" />
                <div className="flex items-center gap-3">
                    <div className="h-5 w-10 rounded bg-[#eef0f5]" />
                    <div className="h-6 w-12 rounded-full bg-[#eef0f5]" />
                </div>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }, (_, index) => (
                    <div
                        key={index}
                        className="h-[280px] overflow-hidden rounded-[8px] bg-[#d3d3d3] shadow-[0_0_4px_rgba(0,0,0,0.1)]"
                    >
                        <div className="h-[160px] bg-[#d3d3d3]" />
                        <div className="flex h-[120px] flex-col gap-3 bg-white p-[10px]">
                            <div className="h-5 w-4/5 rounded bg-[#eef0f5]" />
                            <div className="h-3 w-2/5 rounded bg-[#f4f5f8]" />
                            <div className="h-5 w-1/2 rounded bg-[#eef0f5]" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
