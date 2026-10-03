export function ProductListSkeleton() {
    return (
        <div aria-label="상품 목록을 불러오는 중">
            {Array.from({ length: 6 }, (_, index) => (
                <div
                    key={index}
                    className="flex h-[100px] items-center gap-3 border-b border-[#d3d3d3] px-3 py-3 last:border-b-0"
                >
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-[#eef0f5]" />
                        <div className="h-2 w-1/2 animate-pulse rounded bg-[#f4f5f8]" />
                    </div>
                    <div className="flex w-14 flex-col gap-[5px]">
                        <div className="h-5 w-14 animate-pulse rounded-full bg-[#eef0f5]" />
                        <div className="h-2 w-14 animate-pulse rounded bg-[#f4f5f8]" />
                    </div>
                </div>
            ))}
        </div>
    );
}
