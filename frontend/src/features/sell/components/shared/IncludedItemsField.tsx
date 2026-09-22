"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import { X } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/common/components/ui/Popover";

export type IncludedItemOption = {
    value: string;
    label: string;
};

type IncludedItemsFieldProps = {
    items: string[];
    options: IncludedItemOption[];
    onChange: (value: string, checked: boolean) => void;
    overflow?: boolean;
    maxVisible?: number;
    ariaLabel: string;
};

function Tag({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="inline-flex h-7 items-center gap-1 rounded-full border border-[#6b6c7b] bg-white px-3 text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#6b6c7b]">
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
    options,
    onChange,
    overflow = false,
    maxVisible = 3,
    ariaLabel,
}: IncludedItemsFieldProps) {
    const [inputValue, setInputValue] = useState("");
    const isComposingRef = useRef(false);
    const labelByValue = new Map(options.map((option) => [option.value, option.label]));
    const visibleItems = overflow ? items.slice(0, maxVisible) : items;
    const hiddenItems = overflow ? items.slice(maxVisible) : [];

    const addItem = (value: string) => {
        const nextItem = value.trim();

        if (!nextItem || items.includes(nextItem)) {
            return;
        }

        onChange(nextItem, true);
        setInputValue("");
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

    const getLabel = (value: string) => labelByValue.get(value) ?? value;

    return (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={ariaLabel}>
            {visibleItems.map((item) => (
                <Tag key={item} label={getLabel(item)} onRemove={() => onChange(item, false)} />
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
                                label={getLabel(item)}
                                onRemove={() => onChange(item, false)}
                            />
                        ))}
                    </PopoverContent>
                </Popover>
            )}

            <div className="flex h-7 items-center rounded-full border border-dashed border-[#d3d3d3] px-3">
                <input
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
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
                    className="w-20 bg-transparent text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#6b6c7b] outline-none placeholder:text-[#d3d3d3]"
                />
            </div>
        </div>
    );
}
