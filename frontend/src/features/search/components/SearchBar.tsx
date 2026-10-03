import type { FormEvent } from "react";
import { Search } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { Input } from "@/common/components/ui/Input";

const actionButtonClass =
    "h-11 rounded-full px-[30px] text-[13px] leading-5 font-semibold tracking-[-0.5px]";

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
        <div className="border-b border-[#dee5ed] py-5">
            <div className="layout-container">
                <form
                    role="search"
                    className="flex max-w-[1146px] items-center gap-3"
                    onSubmit={handleSubmit}
                >
                    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full border-[1.5px] border-[#dedee6] bg-[#fafbff] px-5 py-3">
                        <Search
                            aria-hidden="true"
                            className="size-[22px] shrink-0 text-[#83889e]"
                            strokeWidth={1.5}
                        />
                        <Input
                            aria-label="상품 검색"
                            placeholder="상품을 검색해 보세요"
                            value={keyword}
                            onChange={(event) => onKeywordChange(event.target.value)}
                            className="h-[25px] rounded-none border-0 p-0 text-base leading-[25px] text-[#83889e] focus-visible:ring-0 md:text-base dark:bg-transparent"
                        />
                    </div>
                    <Button
                        type="submit"
                        className={`${actionButtonClass} bg-[#5d55fe] text-white hover:bg-[#5148ed]`}
                    >
                        검색
                    </Button>
                    <Button
                        type="button"
                        className={`${actionButtonClass} border-[#5d55fe] bg-white text-[#5d55fe] hover:bg-[#fafbff]`}
                    >
                        AI 검색
                    </Button>
                </form>
            </div>
        </div>
    );
}
