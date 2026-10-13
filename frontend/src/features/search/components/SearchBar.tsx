import type { FormEvent } from "react";
import Image from "next/image";

import { Button } from "@/common/components/ui/Button";
import { Input } from "@/common/components/ui/Input";

export function SearchBar({
    keyword,
    onKeywordChange,
    onSearch,
}: {
    keyword: string;
    onKeywordChange: (keyword: string) => void;
    onSearch: () => void;
}) {
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSearch();
    };

    return (
        <div className="border-b border-[#dee5ed] py-4">
            <div className="layout-container">
                <div className="max-w-[1143px]">
                    <form
                        role="search"
                        className="flex flex-col gap-2 rounded-[24px] border-[1.5px] border-[#dedee6] bg-[#fafbff] px-4 py-2 transition-colors focus-within:border-[#6653fb] hover:border-[#6653fb] sm:h-[60px] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:rounded-[50px] sm:pr-2 sm:pl-6"
                        onSubmit={handleSubmit}
                    >
                        <Input
                            aria-label="상품 검색"
                            placeholder="상품을 검색해 보세요"
                            value={keyword}
                            onChange={(event) => onKeywordChange(event.target.value)}
                            className="h-7 min-w-0 flex-1 rounded-none border-0 p-0 text-base leading-7 font-medium tracking-[0.5px] text-[#6b6c7b] placeholder:text-[#d3d3d3] focus-visible:ring-0 sm:text-[18px] md:text-[18px] dark:bg-transparent"
                        />
                        <Button
                            type="submit"
                            className="h-11 w-28 shrink-0 gap-1 self-end rounded-full bg-[#272727] px-3 text-[14px] leading-[normal] font-semibold text-white hover:bg-[#363636] sm:self-auto"
                        >
                            <Image
                                src="/figma/search/general-search.svg"
                                alt=""
                                width={14}
                                height={17}
                                className="h-4 w-auto"
                                unoptimized
                            />
                            검색
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
