"use client";

import Image from "next/image";
import { Plus, X } from "lucide-react";

import { Badge } from "@/common/components/ui/Badge";
import { Button } from "@/common/components/ui/Button";
import { cn } from "@/common/lib/utils";

export type ProductImagePreview = {
    url: string;
    alt: string;
};

type ProductImageGridProps = {
    images: ProductImagePreview[];
    maxCount: number;
    onAdd?: () => void;
    onRemove?: (url: string) => void;
    readOnly?: boolean;
    size?: "default" | "sm" | "direct" | "review";
    className?: string;
};

const sizeStyles = {
    default: {
        grid: "grid w-full max-w-[760px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5",
        item: "aspect-square rounded-xl",
        add: "aspect-square h-auto w-full rounded-xl",
        badge: "h-9 rounded-none rounded-b-xl text-[16px] leading-7",
        imageSizes: "(min-width: 1024px) 160px, 33vw",
        remove: "top-[-12px] right-[-12px] size-[25px]",
    },
    sm: {
        grid: "flex w-full flex-wrap gap-3",
        item: "size-[100px] rounded-lg",
        add: "size-[100px] rounded-lg",
        badge: "h-6 rounded-none rounded-b-lg text-[10px] leading-[15px]",
        imageSizes: "100px",
        remove: "top-[-8px] right-[-8px] size-5",
    },
    direct: {
        grid: "flex w-full flex-wrap gap-3",
        item: "size-[200px] rounded-[8px]",
        add: "size-[200px] rounded-[8px]",
        badge: "h-[29px] rounded-none rounded-b-[8px] text-[16px] leading-[25px]",
        imageSizes: "200px",
        remove: "top-[-12px] right-[-12px] size-[25px]",
    },
    review: {
        grid: "grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5",
        item: "aspect-square rounded-[8px]",
        add: "aspect-square h-auto w-full rounded-[8px]",
        badge: "h-[29px] rounded-none rounded-b-[8px] text-[16px] leading-[25px]",
        imageSizes: "(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw",
        remove: "top-[-12px] right-[-12px] size-[25px]",
    },
} as const;

export function ProductImageGrid({
    images,
    maxCount,
    onAdd,
    onRemove,
    readOnly = false,
    size = "default",
    className,
}: ProductImageGridProps) {
    const styles = sizeStyles[size];
    const isEditable = !readOnly && onAdd !== undefined && onRemove !== undefined;

    return (
        <div className={cn(styles.grid, className)}>
            {isEditable && images.length < maxCount && (
                <Button
                    type="button"
                    variant="outline"
                    size="icon-lg"
                    aria-label="상품 사진 추가"
                    className={cn(
                        "flex items-center justify-center border-dashed border-[#d3d3d3] bg-white text-center text-[#6653fb] hover:bg-[#f5f4ff]",
                        (size === "sm" || size === "direct" || size === "review") &&
                            "flex-col gap-1",
                        styles.add,
                    )}
                    onClick={(event) => {
                        event.stopPropagation();
                        onAdd();
                    }}
                >
                    <Plus aria-hidden="true" className={cn(size === "sm" ? "size-6" : "size-8")} />
                    {(size === "sm" || size === "direct" || size === "review") && (
                        <span
                            className={cn(
                                "font-normal",
                                size === "direct" || size === "review"
                                    ? "text-[13px] leading-5 text-[#d3d3d3]"
                                    : "text-[11px] leading-[16.5px] text-[#8ca2c0]",
                            )}
                        >
                            사진 추가
                        </span>
                    )}
                </Button>
            )}

            {images.map((image, index) => (
                <div key={image.url} className={cn("relative bg-[#dfdfdf]", styles.item)}>
                    <Image
                        src={image.url}
                        alt={image.alt}
                        fill
                        unoptimized
                        className="rounded-[inherit] object-cover"
                        sizes={styles.imageSizes}
                    />
                    {image.url === images[0]?.url && (
                        <Badge
                            className={cn(
                                "absolute right-0 bottom-0 left-0 w-full justify-center rounded-none bg-[#6653fb] px-2 py-0 font-semibold text-white hover:bg-[#6653fb]",
                                styles.badge,
                            )}
                        >
                            대표
                        </Badge>
                    )}
                    {isEditable && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${index + 1}번 사진 삭제`}
                            className={cn(
                                "absolute top-[-8px] right-[-8px] z-10 flex size-5 items-center justify-center rounded-full bg-[#374151] p-0 text-white hover:bg-[#1f2937]",
                                styles.remove,
                            )}
                            onClick={(event) => {
                                event.stopPropagation();
                                onRemove(image.url);
                            }}
                        >
                            <X
                                aria-hidden="true"
                                className={cn(size === "sm" ? "size-3" : "size-4")}
                            />
                        </Button>
                    )}
                </div>
            ))}
        </div>
    );
}
