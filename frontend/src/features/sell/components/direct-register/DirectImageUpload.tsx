"use client";

import { useRef } from "react";

import {
    ProductImageGrid,
    type ProductImagePreview,
} from "@/common/components/product/ProductImageGrid";
import type { DirectImagePreview } from "./types";

type DirectImageUploadProps = {
    images: DirectImagePreview[];
    onError: (message: string) => void;
    onImagesChange: (images: DirectImagePreview[]) => void;
};

const MAX_FILE_COUNT = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png"]);

function fileKey(file: File) {
    return `${file.name}-${file.size}-${file.lastModified}`;
}

export function DirectImageUpload({ images, onError, onImagesChange }: DirectImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const updateImages = (nextImages: DirectImagePreview[]) => {
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

        const existingKeys = new Set(
            images.filter((image) => image.file).map((image) => fileKey(image.file as File)),
        );
        const newFiles = incomingFiles.filter((file) => !existingKeys.has(fileKey(file)));
        const remainingCount = MAX_FILE_COUNT - images.length;
        const exceedsMaxCount = newFiles.length > remainingCount;

        if (exceedsMaxCount) {
            onError("상품 사진은 최대 10장까지 업로드할 수 있어요.");
        }

        const acceptedFiles = newFiles.slice(0, remainingCount);
        const nextImages: DirectImagePreview[] = [
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

        if (targetImage?.file) {
            URL.revokeObjectURL(targetImage.url);
        }

        updateImages(images.filter((image) => image.url !== targetUrl));
        onError("");
    };

    const openFileDialog = () => inputRef.current?.click();
    const previews: ProductImagePreview[] = images.map((image, index) => ({
        url: image.url,
        alt: `선택한 상품 사진 ${index + 1}`,
    }));

    return (
        <>
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
            <ProductImageGrid
                images={previews}
                maxCount={MAX_FILE_COUNT}
                onAdd={openFileDialog}
                onRemove={removeImage}
                size="direct"
            />
        </>
    );
}
