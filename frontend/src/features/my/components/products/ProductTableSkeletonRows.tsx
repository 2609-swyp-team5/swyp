import { Skeleton } from "@/common/components/ui/Skeleton";
import { TableCell, TableRow } from "@/common/components/ui/Table";

const cellClassName = "block px-4 py-2 md:table-cell md:px-5 md:py-5";

export function ProductTableSkeletonRows({
    count,
    statusLabel,
}: {
    count: number;
    /** 있으면 화면 낭독기용 로딩 안내를 첫 행에 함께 둔다 */
    statusLabel?: string;
}) {
    return Array.from({ length: count }, (_, index) => (
        <TableRow
            key={index}
            className="block border-[#d3d3d3] py-2 hover:bg-transparent md:table-row md:py-0"
        >
            <TableCell className={cellClassName}>
                {index === 0 && statusLabel && (
                    <p role="status" className="sr-only">
                        {statusLabel}
                    </p>
                )}
                <div className="flex items-center gap-3">
                    <Skeleton aria-hidden="true" className="size-12 shrink-0 rounded-[8px]" />
                    <Skeleton aria-hidden="true" className="h-[22px] w-3/4" />
                </div>
            </TableCell>
            <TableCell className={cellClassName}>
                <Skeleton aria-hidden="true" className="h-[22px] w-20" />
            </TableCell>
            <TableCell className={cellClassName}>
                <Skeleton aria-hidden="true" className="h-[30px] w-16 rounded-full" />
            </TableCell>
            <TableCell className={cellClassName}>
                <Skeleton aria-hidden="true" className="h-[30px] w-16 rounded-full" />
            </TableCell>
        </TableRow>
    ));
}
