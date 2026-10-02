export function ProductManagementStreamingSkeleton() {
    return (
        <div aria-label="데이터를 불러오는 중" className="animate-pulse space-y-3">
            <div className="h-4 w-32 rounded bg-[#eef0f5]" />
            <div className="h-8 w-3/5 rounded bg-[#f4f5f8]" />
            <div className="h-4 w-full rounded bg-[#f4f5f8]" />
        </div>
    );
}
