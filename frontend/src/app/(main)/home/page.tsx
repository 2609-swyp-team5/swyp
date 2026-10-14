import type { Metadata } from "next";

import { createPublicPageMetadata } from "@/common/seo/metadata";
import { HomePage } from "@/features/home/components/HomePage";

export const metadata: Metadata = createPublicPageMetadata({
    title: "중고거래 시세 분석 홈",
    description: "상품명과 모델명을 검색해 중고상품 시세와 구매 타이밍을 확인하세요.",
    pathname: "/home",
});

export default function Page() {
    return <HomePage />;
}
