import type { Metadata } from "next";

import { siteUrl } from "@/common/lib/siteUrl";

export const defaultSiteTitle = "지금이니? | AI 중고거래 시세 분석";
export const defaultSiteDescription =
    "AI 중고거래 시세 분석으로 구매 타이밍과 판매 타이밍을 확인하는 지금이니?";
export const defaultOgImage = {
    url: "/brand/jigeumini-og.svg",
    width: 1920,
    height: 1080,
    alt: "지금이니? AI 중고거래 시세 분석",
};

export const noIndexMetadata: Metadata = {
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
        },
    },
};

export function createPublicPageMetadata({
    title,
    description,
    pathname,
}: {
    title: string;
    description: string;
    pathname: string;
}): Metadata {
    const pageTitle = `${title} | 지금이니?`;
    const pageUrl = new URL(pathname, `${siteUrl}/`).toString();

    return {
        title: {
            absolute: "지금이니?",
        },
        description,
        alternates: {
            canonical: pathname,
        },
        openGraph: {
            type: "website",
            locale: "ko_KR",
            url: pageUrl,
            siteName: "지금이니?",
            title: pageTitle,
            description,
            images: [defaultOgImage],
        },
        twitter: {
            card: "summary",
            title: pageTitle,
            description,
            images: [defaultOgImage.url],
        },
    };
}
