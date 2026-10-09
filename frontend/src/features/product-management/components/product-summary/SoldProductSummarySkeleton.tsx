export function SoldProductSummarySkeleton() {
    return (
        <section
            aria-label="판매완료 상품 요약을 불러오는 중"
            className="overflow-hidden rounded-[16px] border border-[#83889e] bg-[#fafbff] shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]"
        >
            <div className="flex animate-pulse flex-col gap-5 border-b border-[#d3d3d3] bg-white px-[30px] py-10">
                <div className="flex flex-col gap-5">
                    <div className="h-[33px] w-24 rounded-full bg-[#eef0f5]" />
                    <div className="flex flex-col gap-2">
                        <div className="h-10 w-4/5 rounded bg-[#eef0f5]" />
                        <div className="h-6 w-40 rounded bg-[#f4f5f8]" />
                    </div>
                </div>

                <div className="flex flex-col gap-4 text-[16px] leading-[25px] font-semibold">
                    <div className="flex items-center justify-between border-b border-[#d3d3d3] py-2.5">
                        <div className="h-6 w-24 rounded bg-[#f4f5f8]" />
                        <div className="h-6 w-28 rounded bg-[#eef0f5]" />
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                        <div className="h-6 w-28 rounded bg-[#f4f5f8]" />
                        <div className="h-6 w-32 rounded bg-[#eef0f5]" />
                    </div>
                </div>

                <div className="flex justify-end">
                    <div className="h-6 w-28 rounded bg-[#f4f5f8]" />
                </div>
            </div>
        </section>
    );
}
