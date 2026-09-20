"use client";

import { useEffect, useRef, useState } from "react";

import {
    ProductImageGrid,
    type ProductImagePreview,
} from "@/common/components/product/ProductImageGrid";

type PreviewImage = {
    file: File;
    url: string;
};

type DirectImageUploadProps = {
    onError: (message: string) => void;
    onFilesChange: (files: File[]) => void;
};

const MAX_FILE_COUNT = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png"]);

function fileKey(file: File) {
    return `${file.name}-${file.size}-${file.lastModified}`;
}

export function DirectImageUpload({ onError, onFilesChange }: DirectImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const imagesRef = useRef<PreviewImage[]>([]);
    const [images, setImages] = useState<PreviewImage[]>([]);

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
