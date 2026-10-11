import { Skeleton } from "@/common/components/ui/Skeleton";

export function SearchResultCardSkeleton() {
    return (
        <div
            aria-hidden="true"
            className="overflow-hidden rounded-xl border border-[#f1f1f1] bg-white"
        >
            <Skeleton className="h-[180px] w-full rounded-none bg-[#dfdfdf]" />
            <div className="flex flex-col gap-2.5 p-4">
                <Skeleton className="h-[21px] w-16" />
                <Skeleton className="h-[22px] w-3/4" />
                <Skeleton className="h-[30px] w-1/2" />
                <Skeleton className="h-[26px] w-full rounded-full" />
                <Skeleton className="h-[18px] w-4/5" />
                <Skeleton className="h-[18px] w-1/3" />
            </div>
        </div>
    );
}
