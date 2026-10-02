export function ProductValuationForecastSkeleton() {
    return (
        <div className="flex flex-col gap-[10px]" aria-label="감가 상각률 데이터를 불러오는 중">
            <div className="h-[25px] w-28 animate-pulse rounded bg-[#eef0f5]" />
            <div className="h-[320px] rounded-[10px] border border-[#d3d3d3] bg-white px-5 py-[22px]">
                <div className="animate-pulse">
                    <div className="flex items-center justify-between gap-3 px-1">
                        <div className="h-[18px] w-32 rounded bg-[#eef0f5]" />
                        <div className="h-3 w-40 rounded bg-[#f4f5f8]" />
                    </div>
                    <div className="mt-5 flex h-[240px] items-end justify-around gap-4 px-5">
                        {[0, 1, 2, 3].map((index) => (
                            <div
                                key={index}
                                className="w-12 rounded-t bg-[#eef0f5]"
                                style={{ height: `${[82, 72, 62, 50][index]}%` }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
