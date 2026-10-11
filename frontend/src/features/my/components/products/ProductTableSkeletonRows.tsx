import { Skeleton } from "@/common/components/ui/Skeleton";
import { TableCell, TableRow } from "@/common/components/ui/Table";

const cellClassName = "px-5 py-5";

export function ProductTableSkeletonRows({
    count,
    statusLabel,
}: {
    count: number;
    /** 있으면 화면 낭독기용 로딩 안내를 첫 행에 함께 둔다 */
    statusLabel?: string;
}) {
    return Array.from({ length: count }, (_, index) => (
        <TableRow key={index} className="border-[#d3d3d3] hover:bg-transparent">
            <TableCell className={cellClassName}>
                {index === 0 && statusLabel && (
                    <p role="status" className="sr-only">
                        {statusLabel}
                    </p>
                )}
                <Skeleton aria-hidden="true" className="h-[22px] w-3/4" />
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
            <TableCell className={cellClassName}>
                <Skeleton aria-hidden="true" className="h-[22px] w-8" />
            </TableCell>
        </TableRow>
    ));
}
