"use client";

import { useRef, useState } from "react";

import { ProductImageGrid } from "@/common/components/product/ProductImageGrid";

type PreviewImage = {
    file: File;
    url: string;
};

export type AiImagePreview = PreviewImage;

type AiImageUploadProps = {
    onError: (message: string) => void;
    images: AiImagePreview[];
    onImagesChange: (images: AiImagePreview[]) => void;
};

const MAX_FILE_COUNT = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png"]);

function fileKey(file: File) {
    return `${file.name}-${file.size}-${file.lastModified}`;
}

export function AiImageUpload({ images, onError, onImagesChange }: AiImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const updateImages = (nextImages: PreviewImage[]) => {
        onImagesChange(nextImages);
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
                role={images.length === 0 ? "button" : undefined}
                tabIndex={images.length === 0 ? 0 : undefined}
                aria-label={images.length === 0 ? "상품 사진 업로드" : undefined}
                className={`relative flex h-[399px] min-h-[280px] w-full flex-col items-center justify-center gap-4 rounded-tl-[16px] rounded-tr-[16px] border border-dashed p-12 transition-colors ${
                    isDragging
                        ? "border-[#6653fb] bg-[#f0efff]"
                        : `border-[#d3d3d3] bg-[#fafbff] ${images.length === 0 ? "cursor-pointer hover:border-[#6653fb]" : ""}`
                }`}
                onClick={images.length === 0 ? openFileDialog : undefined}
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
                    if (images.length > 0) {
                        return;
                    }

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
                    <ProductImageGrid
                        images={images.map((image, index) => ({
                            url: image.url,
                            alt: `선택한 상품 사진 ${index + 1}`,
                        }))}
                        maxCount={MAX_FILE_COUNT}
                        onAdd={openFileDialog}
                        onRemove={removeImage}
                    />
                )}
            </div>
        </div>
    );
}
