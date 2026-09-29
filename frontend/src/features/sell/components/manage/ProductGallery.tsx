"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";

import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/common/components/ui/Dialog";
import {
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverTitle,
    PopoverTrigger,
} from "@/common/components/ui/Popover";
import type { ProductResponse } from "@/features/sell/types";

const previewImageCount = 3;

function GalleryImage({
    src,
    alt,
    sizes,
    className,
}: {
    src: string;
    alt: string;
    sizes: string;
    className: string;
}) {
    const [hasError, setHasError] = useState(false);

    if (hasError) {
        return (
            <div
                role="img"
                aria-label={`${alt} 이미지 로드 실패`}
                className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#f5f5f7] text-[#8b91a8]"
            >
                <ImageOff aria-hidden="true" className="size-7" />
                <span className="text-[12px] font-semibold">이미지를 불러올 수 없습니다</span>
            </div>
        );
    }

    return (
        <Image
            src={src}
            alt={alt}
            fill
            unoptimized
            onError={() => setHasError(true)}
            className={className}
            sizes={sizes}
        />
    );
}

export function ProductGallery({ product }: { product: ProductResponse }) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const selectedImage = product.imageUrls[selectedIndex];
    const viewerImage = product.imageUrls[viewerIndex] ?? selectedImage;
    const visibleImageIndexes = product.imageUrls
        .slice(0, previewImageCount)
        .map((_, index) => index);
    const hiddenImageCount = Math.max(product.imageUrls.length - previewImageCount, 0);

    useEffect(() => {
        if (!isImageViewerOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "ArrowLeft") {
                setViewerIndex((current) => Math.max(current - 1, 0));
            }
            if (event.key === "ArrowRight") {
                setViewerIndex((current) => Math.min(current + 1, product.imageUrls.length - 1));
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isImageViewerOpen, product.imageUrls.length]);

    if (!selectedImage) {
        return (
            <div className="flex aspect-square min-h-[240px] items-center justify-center rounded-[10px] bg-[#f5f5f7] text-[15px] font-medium text-[#6b7395]">
                <span className="flex flex-col items-center gap-2">
                    <ImageOff aria-hidden="true" className="size-7" />
                    등록된 이미지가 없습니다.
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-3 lg:gap-5">
            {product.imageUrls.length > 1 && (
                <div className="flex w-[72px] shrink-0 flex-col gap-3 lg:w-[100px] lg:gap-[10px]">
                    {visibleImageIndexes.map((imageIndex) => (
                        <button
                            key={product.imageUrls[imageIndex]}
                            type="button"
                            aria-label={`${imageIndex + 1}번 상품 사진 보기`}
                            aria-pressed={selectedIndex === imageIndex}
                            className={`relative aspect-square overflow-hidden rounded-lg bg-[#f5f5f7] focus-visible:ring-2 focus-visible:ring-[#6653fb] focus-visible:ring-offset-2 ${
                                selectedIndex === imageIndex ? "border-2 border-[#6653fb]" : ""
                            }`}
                            onClick={() => setSelectedIndex(imageIndex)}
                        >
                            <GalleryImage
                                src={product.imageUrls[imageIndex]}
                                alt={`${product.title} 상품 사진 ${imageIndex + 1}`}
                                className="object-cover"
                                sizes="100px"
                            />
                        </button>
                    ))}
                    {hiddenImageCount > 0 && (
                        <Popover open={isImagePopoverOpen} onOpenChange={setIsImagePopoverOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    aria-label={`추가 상품 사진 ${hiddenImageCount}개 보기`}
                                    className="flex aspect-square items-center justify-center rounded-lg bg-[#f3f3ff] text-[20px] font-medium tracking-[0.5px] text-[#6b6c7b] hover:bg-[#eaeafd] focus-visible:ring-2 focus-visible:ring-[#6653fb] focus-visible:ring-offset-2"
                                >
                                    +{hiddenImageCount}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                side="right"
                                align="start"
                                sideOffset={16}
                                className="w-[494px] gap-5 rounded-[16px] border border-[#dee5ed] bg-white px-[30px] py-8 shadow-[0_12px_30px_rgba(54,54,54,0.14)]"
                            >
                                <div className="flex w-full items-center justify-end">
                                    <button
                                        type="button"
                                        aria-label="상품 사진 팝업 닫기"
                                        className="-mt-1 -mr-1 rounded-full p-1 text-[#d3d3d3] hover:bg-[#f5f3ff] hover:text-[#6653fb] focus-visible:ring-2 focus-visible:ring-[#6653fb]"
                                        onClick={() => setIsImagePopoverOpen(false)}
                                    >
                                        <Image
                                            src="/sell/popup-close.svg"
                                            alt=""
                                            width={22}
                                            height={22}
                                        />
                                    </button>
                                </div>
                                <div className="flex w-full flex-col items-start">
                                    <PopoverTitle className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#363636]">
                                        추가 상품 사진 {hiddenImageCount}개
                                    </PopoverTitle>
                                    <PopoverDescription className="sr-only">
                                        추가 상품 사진을 선택할 수 있습니다.
                                    </PopoverDescription>
                                </div>
                                <div className="grid w-full grid-cols-4 gap-[10px]">
                                    {product.imageUrls
                                        .slice(previewImageCount)
                                        .map((imageUrl, imageOffset) => {
                                            const imageIndex = imageOffset + previewImageCount;

                                            return (
                                                <button
                                                    key={`${imageUrl}-${imageIndex}`}
                                                    type="button"
                                                    aria-label={`${imageIndex + 1}번 상품 사진 선택`}
                                                    aria-pressed={selectedIndex === imageIndex}
                                                    className={`relative size-[100px] overflow-hidden rounded-[5px] bg-[#f5f5f7] focus-visible:ring-2 focus-visible:ring-[#6653fb] focus-visible:ring-offset-2 ${
                                                        selectedIndex === imageIndex
                                                            ? "border-2 border-[#6653fb]"
                                                            : ""
                                                    }`}
                                                    onClick={() => setSelectedIndex(imageIndex)}
                                                >
                                                    <GalleryImage
                                                        src={imageUrl}
                                                        alt={`${product.title} 상품 사진 ${imageIndex + 1}`}
                                                        className="object-cover"
                                                        sizes="100px"
                                                    />
                                                </button>
                                            );
                                        })}
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
            )}
            <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
                <DialogTrigger asChild>
                    <button
                        type="button"
                        aria-label={`${product.title} 상품 사진 ${selectedIndex + 1} 크게 보기`}
                        className="relative aspect-square min-w-0 flex-1 cursor-zoom-in overflow-hidden rounded-[10px] bg-[#f5f5f7] focus-visible:ring-2 focus-visible:ring-[#6653fb] focus-visible:ring-offset-2 lg:size-[432px] lg:flex-none"
                        onClick={() => setViewerIndex(selectedIndex)}
                    >
                        <GalleryImage
                            src={selectedImage}
                            alt={`${product.title} 상품 사진 ${selectedIndex + 1}`}
                            className="object-cover"
                            sizes="(min-width: 1024px) 432px, 100vw"
                        />
                    </button>
                </DialogTrigger>
                <DialogContent className="top-0 left-0 flex h-dvh w-dvw max-w-none translate-x-0 translate-y-0 flex-col gap-5 overflow-hidden rounded-none border-0 bg-[rgba(17,18,22,0.91)] px-6 pt-7 pb-[26px] text-white shadow-none md:px-10">
                    <DialogTitle className="sr-only">
                        {product.title} 상품 사진 크게 보기
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        선택한 상품 사진을 원본 비율로 크게 보고 있습니다. 화살표 키로 사진을 이동할
                        수 있습니다.
                    </DialogDescription>
                    <div className="flex w-full shrink-0 items-start justify-between">
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2.5">
                                <Image
                                    src="/sell/viewer-image-icon.svg"
                                    alt=""
                                    width={22}
                                    height={22}
                                />
                                <span className="text-[20px] leading-[30px] font-semibold tracking-[0.5px]">
                                    상품 이미지
                                </span>
                            </div>
                            <span className="text-[16px] leading-[25px] font-normal text-white/72">
                                ← → 키로도 이동할 수 있어요
                            </span>
                        </div>
                        <div className="flex items-center gap-2 rounded-full bg-[rgba(37,38,44,0.8)] px-3.5 py-2 text-[20px] leading-[30px] tracking-[0.5px]">
                            <span className="font-semibold text-white">{viewerIndex + 1}</span>
                            <span className="font-medium text-white/48">/</span>
                            <span className="font-medium text-white/72">
                                {product.imageUrls.length}
                            </span>
                        </div>
                        <DialogClose asChild>
                            <button
                                type="button"
                                aria-label="상품 이미지 크게 보기 닫기"
                                className="flex h-11 items-center gap-2 rounded-full bg-white px-4 text-[#0b0c0f] shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:bg-[#f2f2f6] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111216]"
                            >
                                <Image src="/sell/viewer-close.svg" alt="" width={20} height={20} />
                                <span className="text-[16px] leading-[25px] font-semibold tracking-[0.5px]">
                                    닫기
                                </span>
                                <span className="rounded-[5px] bg-[#f2f2f6] px-1.5 py-0.5 text-[10px] leading-normal font-semibold text-[#6b6c7b]">
                                    ESC
                                </span>
                            </button>
                        </DialogClose>
                    </div>
                    <div className="flex min-h-0 w-full flex-1 items-center justify-between gap-4 px-0 md:px-8 lg:px-[88px] xl:px-[128px]">
                        <button
                            type="button"
                            aria-label="이전 상품 사진"
                            disabled={viewerIndex === 0}
                            className="flex shrink-0 flex-col items-center gap-2.5 text-white/72 transition hover:text-white focus-visible:ring-2 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-40"
                            onClick={() => setViewerIndex((current) => Math.max(current - 1, 0))}
                        >
                            <span className="relative size-14">
                                <Image
                                    src="/sell/viewer-prev.svg"
                                    alt=""
                                    width={104}
                                    height={104}
                                    className="absolute -inset-6 max-w-none"
                                />
                            </span>
                            <span className="text-[16px] leading-[25px] font-semibold tracking-[0.5px]">
                                이전
                            </span>
                        </button>
                        <div className="relative aspect-square h-full max-h-[680px] w-auto max-w-[680px]">
                            <GalleryImage
                                src={viewerImage}
                                alt={`${product.title} 상품 사진 ${viewerIndex + 1} 크게 보기`}
                                className="object-contain"
                                sizes="min(680px, 70vw)"
                            />
                        </div>
                        <button
                            type="button"
                            aria-label="다음 상품 사진"
                            disabled={viewerIndex === product.imageUrls.length - 1}
                            className="flex shrink-0 flex-col items-center gap-2.5 text-white/72 transition hover:text-white focus-visible:ring-2 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-40"
                            onClick={() =>
                                setViewerIndex((current) =>
                                    Math.min(current + 1, product.imageUrls.length - 1),
                                )
                            }
                        >
                            <span className="relative size-14">
                                <Image
                                    src="/sell/viewer-next.svg"
                                    alt=""
                                    width={104}
                                    height={104}
                                    className="absolute -inset-6 max-w-none"
                                />
                            </span>
                            <span className="text-[16px] leading-[25px] font-semibold tracking-[0.5px]">
                                다음
                            </span>
                        </button>
                    </div>
                    <div className="flex h-[86px] max-w-full shrink-0 items-center justify-center gap-2.5 self-center overflow-x-auto px-[18px]">
                        {product.imageUrls.map((imageUrl, imageIndex) => (
                            <button
                                key={`${imageUrl}-${imageIndex}`}
                                type="button"
                                aria-label={`${imageIndex + 1}번 상품 사진 전체 보기`}
                                aria-current={viewerIndex === imageIndex ? "true" : undefined}
                                className={`relative shrink-0 overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111216] ${
                                    viewerIndex === imageIndex
                                        ? "size-[76px] bg-[#6653fb] p-[3px] shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
                                        : "size-[68px]"
                                }`}
                                onClick={() => setViewerIndex(imageIndex)}
                            >
                                <span className="relative block size-full overflow-hidden rounded-lg">
                                    <GalleryImage
                                        src={imageUrl}
                                        alt={`${product.title} 상품 사진 ${imageIndex + 1} 미리보기`}
                                        className="object-cover"
                                        sizes="76px"
                                    />
                                </span>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
