import type { Metadata } from "next";
import { SearchPage } from "@/features/search/components/SearchPage";
import { Suspense } from "react";

import { createPublicPageMetadata } from "@/common/seo/metadata";

export const metadata: Metadata = createPublicPageMetadata({
    title: "중고상품 시세 검색",
    description: "중고상품을 검색하고 AI 중고거래 시세 분석 결과를 확인하세요.",
    pathname: "/search",
});

export default function Page() {
    return (
        <Suspense fallback={<main aria-label="검색 화면 불러오는 중" />}>
            <SearchPage />
        </Suspense>
    );
}
