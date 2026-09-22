"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { X } from "lucide-react";

import { Badge } from "@/common/components/ui/Badge";
import { Button } from "@/common/components/ui/Button";
import { Input } from "@/common/components/ui/Input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/common/components/ui/Select";
import { Textarea } from "@/common/components/ui/Textarea";
import type { Category } from "@/features/sell/api/categoryApi";
import {
    DirectImageUpload,
    type DirectImagePreview,
} from "@/features/sell/components/direct-register/DirectImageUpload";
import {
    FieldError,
    FieldLabel,
} from "@/features/sell/components/direct-register/DirectRegisterFields";

type FieldErrors = {
    images: string;
    title: string;
    parentCategory: string;
    childCategory: string;
    description: string;
};

export type DirectRegisterInfoState = {
    images: DirectImagePreview[];
    parentCategoryId: string;
    childCategoryId: string;
    title: string;
    brand: string;
    description: string;
    tags: string[];
};

type DirectRegisterInfoStepProps = {
    value: DirectRegisterInfoState;
    categories: Category[];
    categoryStatus: "loading" | "ready" | "error";
    onChange: <K extends keyof DirectRegisterInfoState>(
        key: K,
        value: DirectRegisterInfoState[K],
    ) => void;
    onNext: () => void;
};

function EmptySelectItem({ message }: { message: string }) {
    return (
        <SelectItem value="empty" disabled>
            {message}
        </SelectItem>
    );
}

export function DirectRegisterInfoStep({
    value,
    categories,
    categoryStatus,
    onChange,
    onNext,
}: DirectRegisterInfoStepProps) {
    const [imageError, setImageError] = useState("");
    const [tagInput, setTagInput] = useState("");
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
        images: "",
        title: "",
        parentCategory: "",
        childCategory: "",
        description: "",
    });
    const isTagComposingRef = useRef(false);

    const parentCategories = categories.filter((category) => category.parentId === null);
    const childCategories = categories.filter(
        (category) => category.parentId === Number(value.parentCategoryId),
    );

    const addTag = (tagValue: string) => {
        const nextTag = tagValue.trim();

        if (!nextTag) {
            return;
        }

        onChange("tags", value.tags.includes(nextTag) ? value.tags : [...value.tags, nextTag]);
        setTagInput("");
    };

    const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== "Enter") {
            return;
        }

        if (event.nativeEvent.isComposing || isTagComposingRef.current) {
            return;
        }

        event.preventDefault();
        addTag(event.currentTarget.value);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const nextErrors: FieldErrors = {
            images: value.images.length > 0 ? "" : "상품 사진을 1장 이상 업로드해주세요.",
            title: value.title.trim() ? "" : "상품명을 입력해 주세요.",
            parentCategory: value.parentCategoryId ? "" : "대분류를 선택해 주세요.",
            childCategory: value.childCategoryId ? "" : "중분류를 선택해 주세요.",
            description: value.description.trim() ? "" : "상품 설명을 입력해 주세요.",
        };

        setFieldErrors(nextErrors);

        if (Object.values(nextErrors).some(Boolean)) {
            return;
        }

        onNext();
    };

    const fieldClassName =
        "h-[50px] rounded-[8px] border border-[#d3d3d3] bg-[#fafbff] px-4 py-3 text-[16px] leading-[25px] text-[#6b6c7b] shadow-none placeholder:text-[#d3d3d3] focus-visible:border-[#6653fb] focus-visible:ring-0";
    const selectClassName =
        "h-[50px] w-full rounded-[8px] border border-[#d3d3d3] bg-[#fafbff] px-4 text-[16px] leading-[25px] text-[#6b6c7b] shadow-none data-placeholder:text-[#d3d3d3] focus-visible:border-[#6653fb] focus-visible:ring-0";

    return (
        <form
            id="direct-register-form"
            noValidate
            onSubmit={handleSubmit}
            className="flex w-full max-w-[1144px] flex-col gap-7 rounded-xl border border-[#dee5ed] bg-white p-8"
        >
            <section className="flex flex-col gap-2.5" aria-labelledby="image-label">
                <FieldLabel required>
                    <span id="image-label">상품 이미지</span>
                </FieldLabel>
                <DirectImageUpload
                    images={value.images}
                    onError={setImageError}
                    onImagesChange={(images) => {
                        onChange("images", images);
                        setFieldErrors((current) => ({
                            ...current,
                            images: images.length > 0 ? "" : current.images,
                        }));
                    }}
                />
                <FieldError message={imageError || fieldErrors.images} />
                <p className="text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#6b6c7b]">
                    최대 10장 · 첫 번째 사진이 대표 이미지로 사용됩니다.
                </p>
            </section>

            <section className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="product-title" required>
                    상품명
                </FieldLabel>
                <Input
                    id="product-title"
                    name="title"
                    required
                    value={value.title}
                    placeholder="예: 필름카메라 FM2 니콘"
                    className={fieldClassName}
                    aria-invalid={Boolean(fieldErrors.title)}
                    onChange={(event) => {
                        onChange("title", event.target.value);
                        setFieldErrors((current) => ({ ...current, title: "" }));
                    }}
                />
                <FieldError message={fieldErrors.title} />
            </section>

            <section className="flex flex-col gap-1.5">
                <FieldLabel required>카테고리</FieldLabel>
                <div className="grid gap-3 lg:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                        <Select
                            value={value.parentCategoryId}
                            onValueChange={(nextValue) => {
                                onChange("parentCategoryId", nextValue);
                                onChange("childCategoryId", "");
                                setFieldErrors((current) => {
                                    const hasCategoryError = Boolean(
                                        current.parentCategory || current.childCategory,
                                    );

                                    return {
                                        ...current,
                                        parentCategory: "",
                                        childCategory: hasCategoryError
                                            ? "중분류를 선택해 주세요."
                                            : "",
                                    };
                                });
                            }}
                        >
                            <SelectTrigger
                                className={selectClassName}
                                aria-label="대분류"
                                aria-invalid={Boolean(fieldErrors.parentCategory)}
                            >
                                <SelectValue placeholder="대분류 선택" />
                            </SelectTrigger>
                            <SelectContent
                                position="popper"
                                side="bottom"
                                sideOffset={4}
                                align="start"
                                className="!max-h-60 !w-[var(--radix-select-trigger-width)] !overflow-y-auto !bg-white !text-[#6b6c7b]"
                            >
                                {categoryStatus === "ready" && parentCategories.length > 0 ? (
                                    parentCategories.map((category) => (
                                        <SelectItem key={category.id} value={String(category.id)}>
                                            {category.name}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <EmptySelectItem
                                        message={
                                            categoryStatus === "error"
                                                ? "카테고리를 불러오지 못했어요."
                                                : "카테고리를 불러오는 중이에요."
                                        }
                                    />
                                )}
                            </SelectContent>
                        </Select>
                        <FieldError message={fieldErrors.parentCategory} />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Select
                            value={value.childCategoryId}
                            onValueChange={(nextValue) => {
                                onChange("childCategoryId", nextValue);
                                setFieldErrors((current) => ({
                                    ...current,
                                    childCategory: "",
                                }));
                            }}
                            disabled={!value.parentCategoryId}
                        >
                            <SelectTrigger
                                className={selectClassName}
                                aria-label="중분류"
                                aria-invalid={Boolean(fieldErrors.childCategory)}
                            >
                                <SelectValue placeholder="중분류 선택" />
                            </SelectTrigger>
                            <SelectContent
                                position="popper"
                                side="bottom"
                                sideOffset={4}
                                align="start"
                                className="!max-h-60 !w-[var(--radix-select-trigger-width)] !overflow-y-auto !bg-white !text-[#6b6c7b]"
                            >
                                {childCategories.length > 0 ? (
                                    childCategories.map((category) => (
                                        <SelectItem key={category.id} value={String(category.id)}>
                                            {category.name}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <EmptySelectItem message="대분류를 먼저 선택해 주세요." />
                                )}
                            </SelectContent>
                        </Select>
                        <FieldError message={fieldErrors.childCategory} />
                    </div>
                </div>
            </section>

            <section className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="brand">브랜드</FieldLabel>
                <Input
                    id="brand"
                    name="brand"
                    value={value.brand}
                    placeholder="브랜드 검색 또는 직접 입력"
                    className={fieldClassName}
                    onChange={(event) => onChange("brand", event.target.value)}
                />
            </section>

            <section className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="description" required>
                    상품 설명
                </FieldLabel>
                <Textarea
                    id="description"
                    name="description"
                    required
                    value={value.description}
                    placeholder="상품의 특징, 사용 기간, 상태를 자세히 작성해 주세요."
                    className="[field-sizing:fixed] h-[140px] max-h-[140px] min-h-[140px] resize-none overflow-y-auto rounded-[8px] border-[1.5px] border-[#d3d3d3] bg-[#fafbff] px-4 py-3 text-[16px] leading-[25px] text-[#6b6c7b] shadow-none placeholder:text-[#d3d3d3] focus-visible:border-[#6653fb] focus-visible:ring-0"
                    aria-invalid={Boolean(fieldErrors.description)}
                    onChange={(event) => {
                        onChange("description", event.target.value);
                        setFieldErrors((current) => ({ ...current, description: "" }));
                    }}
                />
                <FieldError message={fieldErrors.description} />
            </section>

            <section className="flex flex-col gap-1.5">
                <FieldLabel>태그</FieldLabel>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {value.tags.map((tag) => (
                        <Badge
                            key={tag}
                            className="h-7 gap-1 rounded-full border-[#6b6c7b] bg-white px-3 py-1 text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#6b6c7b] hover:bg-white"
                        >
                            #{tag}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                aria-label={`${tag} 태그 삭제`}
                                className="size-4 rounded-full p-0 text-[#6b6c7b]/60 hover:bg-transparent hover:text-[#6b6c7b]"
                                onClick={() =>
                                    onChange(
                                        "tags",
                                        value.tags.filter((currentTag) => currentTag !== tag),
                                    )
                                }
                            >
                                <X aria-hidden="true" className="size-3" />
                            </Button>
                        </Badge>
                    ))}
                    <div className="flex h-7 items-center rounded-full border border-dashed border-[#d3d3d3] px-3">
                        <input
                            value={tagInput}
                            onChange={(event) => setTagInput(event.target.value)}
                            onKeyDown={handleTagKeyDown}
                            onCompositionStart={() => {
                                isTagComposingRef.current = true;
                            }}
                            onCompositionEnd={(event) => {
                                isTagComposingRef.current = false;
                                setTagInput(event.currentTarget.value);
                            }}
                            onBlur={(event) => {
                                if (!isTagComposingRef.current) {
                                    addTag(event.currentTarget.value);
                                }
                            }}
                            aria-label="태그 추가"
                            placeholder="태그 추가"
                            className="w-20 bg-transparent text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#6b6c7b] outline-none placeholder:text-[#d3d3d3]"
                        />
                    </div>
                </div>
            </section>
        </form>
    );
}
