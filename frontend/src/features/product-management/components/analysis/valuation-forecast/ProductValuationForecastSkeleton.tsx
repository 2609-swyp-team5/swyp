export function ProductValuationForecastSkeleton() {
    return (
        <section
            className="min-w-0 rounded-[10px] border border-[#6653fb] bg-white p-5"
            aria-label="감가 상각률 데이터를 불러오는 중"
        >
            <div className="animate-pulse">
                <div className="flex h-[45px] items-start justify-between gap-3 px-1">
                    <div className="flex flex-col gap-[5px]">
                        <div className="h-[25px] w-36 rounded bg-[#eef0f5]" />
                        <div className="h-[15px] w-52 rounded bg-[#f4f5f8]" />
                    </div>
                    <div className="h-[18px] w-36 rounded bg-[#f4f5f8]" />
                </div>
                <div className="mt-3 flex h-[281px] items-end justify-around gap-4 px-[50px]">
                    {[0, 1, 2, 3].map((index) => (
                        <div
                            key={index}
                            className="w-12 rounded-t bg-[#eef0f5]"
                            style={{ height: `${[82, 72, 62, 50][index]}%` }}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
