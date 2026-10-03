import { SearchPage } from "@/features/search/components/SearchPage";
import { Suspense } from "react";

export default function Page() {
    return (
        <Suspense fallback={<main aria-label="검색 화면 불러오는 중" />}>
            <SearchPage />
        </Suspense>
    );
}
