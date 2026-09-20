"use client";

import {
    useEffect,
    useRef,
    useState,
    type FocusEvent,
    type FormEvent,
    type KeyboardEvent,
    type ReactNode,
} from "react";

import { useRouter } from "next/navigation";
import { CircleAlert, X } from "lucide-react";

import { Alert, AlertDescription } from "@/common/components/ui/Alert";
import { Badge } from "@/common/components/ui/Badge";
import { Button } from "@/common/components/ui/Button";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/common/components/ui/Select";
import { Textarea } from "@/common/components/ui/Textarea";
import { categoryApi, type Category } from "@/features/sell/api/categoryApi";
import { DirectImageUpload } from "@/features/sell/components/DirectImageUpload";
import { ExitDialog } from "@/features/sell/components/ExitDialog";

type FieldLabelProps = {
    htmlFor?: string;
    required?: boolean;
    children: ReactNode;
};

type FieldErrors = {
    title: string;
    category: string;
    description: string;
};

function FieldLabel({ htmlFor, required = false, children }: FieldLabelProps) {
    return (
        <div className="flex min-h-[21px] items-center gap-3">
            <Label
                htmlFor={htmlFor}
                className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#464646]"
            >
                {children}
                {required && <span> *</span>}
            </Label>
        </div>
    );
}

function FieldError({ message }: { message?: string }) {
    if (!message) {
        return null;
    }

    return (
        <Alert
            variant="destructive"
            className="flex w-fit items-center gap-2 border-0 bg-transparent p-0 shadow-none"
        >
            <span className="flex size-4 shrink-0 items-center justify-center">
                <CircleAlert aria-hidden="true" className="size-4" />
            </span>
            <AlertDescription className="text-destructive p-0 text-[12px] leading-[18px]">
                {message}
            </AlertDescription>
        </Alert>
    );
}

function RegistrationStepper() {
    const steps = ["상품 정보", "상태·가격"];

    return (
        <ol aria-label="상품 등록 단계" className="flex items-center gap-2.5">
            {steps.map((step, index) => (
                <li key={step} className="flex items-center gap-2.5">
                    <div className="flex items-center gap-2">
                        <span
                            className={`flex size-7 items-center justify-center rounded-full text-[13px] leading-[19px] font-bold ${
                                index === 0
                                    ? "bg-[#272727] text-white"
                                    : "bg-[#d3d3d3] text-[#6b6c7b]"
                            }`}
                        >
                            {index + 1}
                        </span>
                        <span
                            className={`text-[16px] leading-[25px] font-semibold tracking-[0.5px] ${
                                index === 0 ? "text-[#363636]" : "text-[#d3d3d3]"
                            }`}
                        >
                            {step}
                        </span>
                    </div>
                    {index < steps.length - 1 && (
                        <span aria-hidden="true" className="h-px w-[30px] bg-[#d3d3d3]" />
                    )}
                </li>
            ))}
        </ol>
    );
}

function EmptySelectItem({ message }: { message: string }) {
    return (
        <SelectItem value="empty" disabled>
            {message}
        </SelectItem>
    );
}

export function DirectRegisterPage() {
    const router = useRouter();
    const [imageError, setImageError] = useState("");
    const [, setImages] = useState<File[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryStatus, setCategoryStatus] = useState<"loading" | "ready" | "error">("loading");
    const [parentCategoryId, setParentCategoryId] = useState("");
    const [childCategoryId, setChildCategoryId] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
    const isTagComposingRef = useRef(false);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
        title: "",
        category: "",
        description: "",
    });

    useEffect(() => {
        let isMounted = true;

        categoryApi
            .getCategories()
            .then(({ data }) => {
                if (!isMounted) {
                    return;
                }

                if (data.success) {
                    setCategories(data.data);
                    setCategoryStatus("ready");
                } else {
                    setCategoryStatus("error");
                }
            })
            .catch(() => {
                if (isMounted) {
                    setCategoryStatus("error");
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const parentCategories = categories.filter((category) => category.parentId === null);
    const childCategories = categories.filter(
        (category) => category.parentId === Number(parentCategoryId),
    );

    const addTag = (value: string) => {
        const nextTag = value.trim();

        if (!nextTag) {
            return;
        }

        setTags((currentTags) =>
            currentTags.includes(nextTag) ? currentTags : [...currentTags, nextTag],
        );
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

    const handleTagBlur = (event: FocusEvent<HTMLInputElement>) => {
        if (isTagComposingRef.current) {
            return;
        }

        addTag(event.currentTarget.value);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const nextErrors: FieldErrors = {
            title: formData.get("title")?.toString().trim() ? "" : "상품명을 입력해 주세요.",
            category: parentCategoryId && childCategoryId ? "" : "카테고리를 선택해 주세요.",
            description: formData.get("description")?.toString().trim()
                ? ""
                : "상품 설명을 입력해 주세요.",
        };

        setFieldErrors(nextErrors);

        if (Object.values(nextErrors).some(Boolean)) {
            return;
        }

        router.push("/sell/register/direct/status");
    };

    const fieldClassName =
        "h-[50px] rounded-[8px] border border-[#d3d3d3] bg-[#fafbff] px-4 py-3 text-[16px] leading-[25px] text-[#6b6c7b] shadow-none placeholder:text-[#d3d3d3] focus-visible:border-[#6653fb] focus-visible:ring-0";
    const selectClassName =
        "h-[50px] w-full rounded-[8px] border border-[#d3d3d3] bg-[#fafbff] px-4 text-[16px] leading-[25px] text-[#6b6c7b] shadow-none data-placeholder:text-[#d3d3d3] focus-visible:border-[#6653fb] focus-visible:ring-0";

    return (
        <main className="flex flex-1 flex-col bg-white">
            <section className="layout-container flex flex-1 flex-col gap-20 pt-16 pb-[120px]">
                <header className="flex flex-col gap-[52px]">
                    <p className="text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#363636]">
                        직접입력으로
                    </p>
                    <h1 className="text-[60px] leading-[75px] font-bold tracking-[0.5px] text-[#6653fb]">
                        상품 등록
                    </h1>
                </header>

                <div className="flex flex-col gap-8">
                    <RegistrationStepper />

                    <form
                        id="direct-register-form"
                        noValidate
                        onSubmit={handleSubmit}
                        className="flex w-full max-w-[1144px] flex-col gap-7 rounded-xl border border-[#dee5ed] bg-white p-8"
                    >
                        <section className="flex flex-col gap-2.5" aria-labelledby="image-label">
                            <FieldLabel>
                                <span id="image-label">상품 이미지</span>
                            </FieldLabel>
                            <DirectImageUpload onError={setImageError} onFilesChange={setImages} />
                            <FieldError message={imageError} />
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
                                placeholder="예: 필름카메라 FM2 니콘"
                                className={fieldClassName}
                                aria-invalid={Boolean(fieldErrors.title)}
                                onChange={() =>
                                    setFieldErrors((current) => ({ ...current, title: "" }))
                                }
                            />
                            <FieldError message={fieldErrors.title} />
                        </section>

                        <section className="flex flex-col gap-1.5">
                            <FieldLabel required>카테고리</FieldLabel>
                            <div className="grid gap-3 lg:grid-cols-2">
                                <Select
                                    value={parentCategoryId}
                                    onValueChange={(value) => {
                                        setParentCategoryId(value);
                                        setChildCategoryId("");
                                        setFieldErrors((current) => ({
                                            ...current,
                                            category: "",
                                        }));
                                    }}
                                >
                                    <SelectTrigger
                                        className={selectClassName}
                                        aria-label="대분류"
                                        aria-invalid={Boolean(fieldErrors.category)}
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
                                        {categoryStatus === "ready" &&
                                        parentCategories.length > 0 ? (
                                            parentCategories.map((category) => (
                                                <SelectItem
                                                    key={category.id}
                                                    value={String(category.id)}
                                                >
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

                                <Select
                                    value={childCategoryId}
                                    onValueChange={(value) => {
                                        setChildCategoryId(value);
                                        setFieldErrors((current) => ({
                                            ...current,
                                            category: "",
                                        }));
                                    }}
                                    disabled={!parentCategoryId}
                                >
                                    <SelectTrigger
                                        className={selectClassName}
                                        aria-label="중분류"
                                        aria-invalid={Boolean(fieldErrors.category)}
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
                                                <SelectItem
                                                    key={category.id}
                                                    value={String(category.id)}
                                                >
                                                    {category.name}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <EmptySelectItem message="대분류를 먼저 선택해 주세요." />
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <FieldError message={fieldErrors.category} />
                        </section>

                        <section className="flex flex-col gap-1.5">
                            <FieldLabel htmlFor="brand">브랜드</FieldLabel>
                            <Input
                                id="brand"
                                name="brand"
                                placeholder="브랜드 검색 또는 직접 입력"
                                className={fieldClassName}
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
                                placeholder="상품의 특징, 사용 기간, 상태를 자세히 작성해 주세요."
                                className="[field-sizing:fixed] h-[140px] max-h-[140px] min-h-[140px] resize-none overflow-y-auto rounded-[8px] border-[1.5px] border-[#d3d3d3] bg-[#fafbff] px-4 py-3 text-[16px] leading-[25px] text-[#6b6c7b] shadow-none placeholder:text-[#d3d3d3] focus-visible:border-[#6653fb] focus-visible:ring-0"
                                aria-invalid={Boolean(fieldErrors.description)}
                                onChange={() =>
                                    setFieldErrors((current) => ({
                                        ...current,
                                        description: "",
                                    }))
                                }
                            />
                            <FieldError message={fieldErrors.description} />
                        </section>

                        <section className="flex flex-col gap-1.5">
                            <FieldLabel>태그</FieldLabel>
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                {tags.map((tag) => (
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
                                                setTags((currentTags) =>
                                                    currentTags.filter(
                                                        (currentTag) => currentTag !== tag,
                                                    ),
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
                                        onBlur={handleTagBlur}
                                        aria-label="태그 추가"
                                        placeholder="태그 추가"
                                        className="w-20 bg-transparent text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#6b6c7b] outline-none placeholder:text-[#d3d3d3]"
                                    />
                                </div>
                            </div>
                        </section>
                    </form>

                    <div className="flex w-full max-w-[1144px] items-center justify-end gap-3">
                        <Button
                            type="button"
                            className="h-[54px] rounded-full border-0 bg-[#d3d3d3] px-[50px] py-3 text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-white hover:bg-[#c6c6c6]"
                            onClick={() => setIsExitDialogOpen(true)}
                        >
                            나가기
                        </Button>
                        <Button
                            type="submit"
                            form="direct-register-form"
                            className="h-[54px] rounded-full bg-[#6653fb] px-[50px] py-3 text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-white hover:bg-[#5d4cf0]"
                        >
                            다음단계
                        </Button>
                    </div>
                </div>
            </section>

            <ExitDialog
                open={isExitDialogOpen}
                onClose={() => setIsExitDialogOpen(false)}
                onConfirm={() => {
                    setIsExitDialogOpen(false);
                    router.push("/sell/register");
                }}
            />
        </main>
    );
}
