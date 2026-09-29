"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import { CircleAlert, X } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/common/components/ui/Popover";

type IncludedItemsFieldProps = {
    items: string[];
    onChange: (value: string, checked: boolean) => void;
    overflow?: boolean;
    maxVisible?: number;
    ariaLabel: string;
};

function Tag({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="inline-flex h-7 items-center gap-1 rounded-full border border-[#6b6c7b] bg-white px-[15px] py-1 text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#6b6c7b]">
            <span>{label}</span>
            <button
                type="button"
                aria-label={`${label} 구성품 삭제`}
                className="flex size-4 items-center justify-center rounded-full text-[#6b6c7b]/70 transition-colors hover:text-[#6b6c7b] focus-visible:ring-2 focus-visible:ring-[#6653fb]/30 focus-visible:outline-none"
                onClick={onRemove}
            >
                <X aria-hidden="true" className="size-3" />
            </button>
        </span>
    );
}

export function IncludedItemsField({
    items,
    onChange,
    overflow = false,
    maxVisible = 3,
    ariaLabel,
}: IncludedItemsFieldProps) {
    const [inputValue, setInputValue] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const isComposingRef = useRef(false);
    const visibleItems = overflow ? items.slice(0, maxVisible) : items;
    const hiddenItems = overflow ? items.slice(maxVisible) : [];

    const addItem = (value: string) => {
        const nextItem = value.trim();

        if (!nextItem || items.includes(nextItem)) {
            return;
        }

        if (items.length >= 10) {
            setErrorMessage("구성품은 최대 10개까지 추가할 수 있습니다.");
            return;
        }

        onChange(nextItem, true);
        setInputValue("");
        setErrorMessage("");
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== "Enter") {
            return;
        }

        if (event.nativeEvent.isComposing || isComposingRef.current) {
            return;
        }

        event.preventDefault();
        addItem(event.currentTarget.value);
    };

    return (
        <div className="flex flex-col items-start gap-2" role="group" aria-label={ariaLabel}>
            <div className="flex flex-wrap items-center gap-2">
                {visibleItems.map((item) => (
                    <Tag
                        key={item}
                        label={item}
                        onRemove={() => {
                            onChange(item, false);
                            setErrorMessage("");
                        }}
                    />
                ))}

                {hiddenItems.length > 0 && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="inline-flex h-7 items-center rounded-full border border-[#6653fb] bg-white px-3 text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#6653fb] transition-colors hover:bg-[#fafbff] focus-visible:ring-2 focus-visible:ring-[#6653fb]/30 focus-visible:outline-none"
                                aria-label={`숨겨진 구성품 ${hiddenItems.length}개 보기`}
                            >
                                +{hiddenItems.length}개
                            </button>
                        </PopoverTrigger>
                        <PopoverContent
                            align="start"
                            className="flex w-auto max-w-[280px] flex-row flex-wrap gap-2 rounded-xl border border-[#e4e4e4] bg-white p-3"
                        >
                            {hiddenItems.map((item) => (
                                <Tag
                                    key={item}
                                    label={item}
                                    onRemove={() => {
                                        onChange(item, false);
                                        setErrorMessage("");
                                    }}
                                />
                            ))}
                        </PopoverContent>
                    </Popover>
                )}

                <div className="flex h-7 items-center rounded-full border border-dashed border-[#d3d3d3] px-[15px] py-1">
                    <input
                        value={inputValue}
                        onChange={(event) => {
                            setInputValue(event.target.value);
                            setErrorMessage("");
                        }}
                        onKeyDown={handleKeyDown}
                        onCompositionStart={() => {
                            isComposingRef.current = true;
                        }}
                        onCompositionEnd={(event) => {
                            isComposingRef.current = false;
                            setInputValue(event.currentTarget.value);
                        }}
                        onBlur={(event) => {
                            if (!isComposingRef.current) {
                                addItem(event.currentTarget.value);
                            }
                        }}
                        aria-label="구성품 추가"
                        placeholder="태그 추가"
                        className="w-[52px] bg-transparent text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#6b6c7b] outline-none placeholder:text-[#d3d3d3]"
                    />
                </div>
            </div>
            {errorMessage && (
                <div role="alert" className="text-destructive flex items-center gap-2">
                    <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
                    <p className="text-[12px] leading-[18px]">{errorMessage}</p>
                </div>
            )}
        </div>
    );
}
