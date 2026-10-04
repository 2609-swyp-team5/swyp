import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";

import { Button } from "@/common/components/ui/Button";
import { Input } from "@/common/components/ui/Input";
import { cn } from "@/common/lib/utils";

export function SearchBar({
    keyword,
    onKeywordChange,
    onSearch,
    isSearching = false,
    initialMode = "general",
}: {
    keyword: string;
    onKeywordChange: (keyword: string) => void;
    onSearch: (mode: "general" | "ai") => void;
    isSearching?: boolean;
    initialMode?: "general" | "ai";
}) {
    const [mode, setMode] = useState<"general" | "ai">(initialMode);
    const inputRef = useRef<HTMLInputElement>(null);
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSearch(mode);
    };

    return (
        <div className="border-b border-[#dee5ed] py-4">
            <div className="layout-container">
                <div className="max-w-[1143px]">
                    <form
                        role="search"
                        className="flex flex-col gap-2 rounded-[24px] border-[1.5px] border-[#dedee6] bg-[#fafbff] px-4 py-2 sm:h-[60px] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:rounded-[50px] sm:pr-2 sm:pl-6"
                        onSubmit={handleSubmit}
                    >
                        <Input
                            ref={inputRef}
                            aria-label="상품 검색"
                            placeholder={
                                mode === "general" ? "상품을 검색해 보세요" : "무엇이든 물어보세요"
                            }
                            value={keyword}
                            maxLength={mode === "ai" ? 200 : undefined}
                            onChange={(event) => onKeywordChange(event.target.value)}
                            className="h-7 min-w-0 flex-1 rounded-none border-0 p-0 text-base leading-7 font-medium tracking-[0.5px] text-[#83889e] placeholder:text-[#83889e] focus-visible:ring-0 sm:text-[18px] md:text-[18px] dark:bg-transparent"
                        />
                        <div
                            role="group"
                            aria-label="검색 모드"
                            className="flex h-11 w-56 shrink-0 self-end overflow-hidden rounded-full border border-[#d3d3d3] bg-white p-px sm:self-auto"
                        >
                            <Button
                                type={mode === "ai" ? "submit" : "button"}
                                disabled={isSearching}
                                variant="ghost"
                                aria-pressed={mode === "ai"}
                                onClick={(event) => {
                                    if (mode === "ai") return;
                                    event.preventDefault();
                                    setMode("ai");
                                    inputRef.current?.focus();
                                }}
                                className={cn(
                                    "h-full flex-1 gap-1 rounded-full border border-transparent px-3 text-[14px] leading-[normal] font-semibold transition-colors duration-200 motion-reduce:transition-none",
                                    mode === "ai"
                                        ? "bg-[#6653fb] text-white hover:bg-[#5745e7] hover:text-white"
                                        : "text-[#d3d3d3] hover:bg-[#fafbff] hover:text-[#83889e]",
                                )}
                            >
                                {mode === "ai" && (
                                    <Image
                                        src="/figma/search/ai-search.svg"
                                        alt=""
                                        width={19.8066}
                                        height={26.6958}
                                        className="h-[22px] w-auto brightness-0 invert"
                                        unoptimized
                                    />
                                )}
                                AI 검색
                            </Button>
                            <Button
                                type={mode === "general" ? "submit" : "button"}
                                variant="ghost"
                                aria-pressed={mode === "general"}
                                onClick={(event) => {
                                    if (mode !== "general") event.preventDefault();
                                    setMode("general");
                                }}
                                className={cn(
                                    "h-full flex-1 gap-1 rounded-full border border-transparent px-3 text-[14px] leading-[normal] font-semibold transition-colors duration-200 motion-reduce:transition-none",
                                    mode === "general"
                                        ? "bg-[#272727] text-white hover:bg-[#363636] hover:text-white"
                                        : "text-[#d3d3d3] hover:bg-[#fafbff] hover:text-[#83889e]",
                                )}
                            >
                                {mode === "general" && (
                                    <Image
                                        src="/figma/search/general-search.svg"
                                        alt=""
                                        width={14.2}
                                        height={17.2}
                                        className="h-4 w-auto"
                                        unoptimized
                                    />
                                )}
                                일반 검색
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
