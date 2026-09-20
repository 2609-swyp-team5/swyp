"use client";

import { useEffect, useRef, useState } from "react";

import Image from "next/image";
import { Plus, X } from "lucide-react";

import { Badge } from "@/common/components/ui/Badge";
import { Button } from "@/common/components/ui/Button";

type PreviewImage = {
    file: File;
    url: string;
};

type AiImageUploadProps = {
    onError: (message: string) => void;
    onFilesChange: (files: File[]) => void;
};

const MAX_FILE_COUNT = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png"]);

function fileKey(file: File) {
    return `${file.name}-${file.size}-${file.lastModified}`;
}

export function AiImageUpload({ onError, onFilesChange }: AiImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const imagesRef = useRef<PreviewImage[]>([]);
    const [images, setImages] = useState<PreviewImage[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        return () => {
            imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
        };
    }, []);

    const updateImages = (nextImages: PreviewImage[]) => {
        imagesRef.current = nextImages;
        setImages(nextImages);
        onFilesChange(nextImages.map((image) => image.file));
    };

    const addFiles = (fileList: FileList | File[]) => {
        const incomingFiles = Array.from(fileList);
        const invalidType = incomingFiles.find((file) => !ACCEPTED_TYPES.has(file.type));

        if (invalidType) {
            onError("JPG 또는 PNG 파일만 업로드할 수 있어요.");
            return;
        }

        const oversizedFile = incomingFiles.find((file) => file.size > MAX_FILE_SIZE);

        if (oversizedFile) {
            onError("파일 크기는 20MB 이하만 업로드할 수 있어요.");
            return;
        }

        const existingKeys = new Set(images.map((image) => fileKey(image.file)));
        const newFiles = incomingFiles.filter((file) => !existingKeys.has(fileKey(file)));
        const remainingCount = MAX_FILE_COUNT - images.length;

        const exceedsMaxCount = newFiles.length > remainingCount;

        if (exceedsMaxCount) {
            onError("상품 사진은 최대 10장까지 업로드할 수 있어요.");
        }

        const acceptedFiles = newFiles.slice(0, remainingCount);
        const nextImages = [
            ...images,
            ...acceptedFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
        ];

        if (acceptedFiles.length > 0) {
            if (!exceedsMaxCount) {
                onError("");
            }
            updateImages(nextImages);
        }
    };

    const removeImage = (targetUrl: string) => {
        const targetImage = images.find((image) => image.url === targetUrl);

        if (targetImage) {
            URL.revokeObjectURL(targetImage.url);
        }

        const nextImages = images.filter((image) => image.url !== targetUrl);
        updateImages(nextImages);
        onError("");
    };

    const openFileDialog = () => inputRef.current?.click();

    return (
        <div className="flex w-full flex-col gap-2">
            <div
                role="button"
                tabIndex={0}
                aria-label="상품 사진 업로드"
                className={`relative flex h-[399px] min-h-[280px] w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-tl-[16px] rounded-tr-[16px] border border-dashed p-12 transition-colors ${
                    isDragging
                        ? "border-[#6653fb] bg-[#f0efff]"
                        : "border-[#d3d3d3] bg-[#fafbff] hover:border-[#6653fb]"
                }`}
                onClick={openFileDialog}
                onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    addFiles(event.dataTransfer.files);
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openFileDialog();
                    }
                }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                        if (event.target.files) {
                            addFiles(event.target.files);
                        }
                        event.target.value = "";
                    }}
                />

                {images.length === 0 ? (
                    <>
                        <span className="flex size-16 items-center justify-center rounded-full bg-[linear-gradient(34deg,#ededff_6%,#c7c4e3_94%)]">
                            <span aria-hidden="true" className="text-[28px] leading-[42px]">
                                📷
                            </span>
                        </span>
                        <span className="flex flex-col items-center gap-2 text-center">
                            <span className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#545d82]">
                                사진을 끌어다 놓거나
                            </span>
                            <span className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#6653fb] underline underline-offset-2">
                                파일에서 선택하기
                            </span>
                        </span>
                        <span className="text-[10px] leading-[15px] tracking-[-0.5px] text-[#8ca2c0]">
                            JPG, PNG · 최대 20MB · 최대 10장
                        </span>
                    </>
                ) : (
                    <div className="grid w-full max-w-[760px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {images.map((image, index) => (
                            <div
                                key={image.url}
                                className="relative aspect-square overflow-hidden rounded-xl bg-[#e5eafc]"
                            >
                                <Image
                                    src={image.url}
                                    alt={`선택한 상품 사진 ${index + 1}`}
                                    fill
                                    unoptimized
                                    className="object-cover"
                                    sizes="(min-width: 1024px) 160px, 33vw"
                                />
                                {image.url === images[0]?.url && (
                                    <Badge className="absolute top-2 left-2 h-auto rounded-full bg-[#6653fb] px-2 py-1 text-[11px] leading-4 font-semibold text-white hover:bg-[#6653fb]">
                                        대표 이미지
                                    </Badge>
                                )}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`${index + 1}번 사진 삭제`}
                                    className="absolute top-2 right-2 rounded-full bg-black/65 text-white hover:bg-black/80"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        removeImage(image.url);
                                    }}
                                >
                                    <X aria-hidden="true" className="size-4" />
                                </Button>
                            </div>
                        ))}
                        {images.length < MAX_FILE_COUNT && (
                            <Button
                                type="button"
                                variant="outline"
                                size="icon-lg"
                                aria-label="상품 사진 추가"
                                className="flex aspect-square h-auto w-full rounded-xl border-dashed border-[#d3d3d3] bg-white text-[#6653fb] hover:bg-[#f5f4ff]"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    openFileDialog();
                                }}
                            >
                                <Plus aria-hidden="true" className="size-8" />
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
