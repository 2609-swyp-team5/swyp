import { isAxiosError } from "axios";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";

import { siteOrigin } from "@/common/lib/siteUrl";
import {
    createPublicPageMetadata,
    defaultSiteDescription,
    noIndexMetadata,
} from "@/common/seo/metadata";
import { searchApi } from "@/features/search/api/searchApi";
import { SearchProductDetailPage } from "@/features/search/components/detail/SearchProductDetailPage";
import type { SearchProductDetail } from "@/features/search/types";

type ProductLookup =
    | { status: "found"; product: SearchProductDetail }
    | { status: "not-found" }
    | { status: "unavailable" };

function parseTargetId(id: string) {
    const targetId = Number(id);
    return Number.isSafeInteger(targetId) && targetId > 0 ? targetId : null;
}

const metadataCrawlerPattern =
    /(?:bot\b|crawler\b|spider\b|facebookexternalhit|google-inspectiontool|kakaotalk|whatsapp|yeti|bingpreview|daum|tistory)/i;

function isMetadataCrawler(userAgent: string) {
    return metadataCrawlerPattern.test(userAgent);
}

function normalizeProductImageUrl(imageUrl: string) {
    const normalizedUrl = imageUrl.trim().replace(/\{res\}/gi, "360");

    if (!/^https?:\/\//i.test(normalizedUrl) || /[{}]/.test(normalizedUrl)) {
        return null;
    }

    return normalizedUrl;
}

const lookupProduct = cache(async (id: number): Promise<ProductLookup> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const { data } = await searchApi.searchProductDetail(id, controller.signal);
        return data.success ? { status: "found", product: data.data } : { status: "not-found" };
    } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
            return { status: "not-found" };
        }

        return { status: "unavailable" };
    } finally {
        clearTimeout(timeout);
    }
});

function ProductStructuredData({ product }: { product: SearchProductDetail }) {
    const productUrl = new URL(`/search/${product.id}`, siteOrigin).toString();
    const title = product.title.trim();
    const description = product.description?.trim();
    const images = product.imageUrls
        .map(normalizeProductImageUrl)
        .filter((imageUrl): imageUrl is string => imageUrl !== null);
    const productJsonLd = {
        "@type": "Product",
        name: title,
        url: productUrl,
        ...(description ? { description } : {}),
        ...(images.length > 0 ? { image: images } : {}),
        ...(product.category.name ? { category: product.category.name } : {}),
    };
    const breadcrumbJsonLd = {
        "@type": "BreadcrumbList",
        itemListElement: [
            {
                "@type": "ListItem",
                position: 1,
                name: "홈",
                item: new URL("/home", siteOrigin).toString(),
            },
            {
                "@type": "ListItem",
                position: 2,
                name: "상품 검색",
                item: new URL("/search", siteOrigin).toString(),
            },
            {
                "@type": "ListItem",
                position: 3,
                name: title,
                item: productUrl,
            },
        ],
    };
    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [productJsonLd, breadcrumbJsonLd],
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
            }}
        />
    );
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const targetId = parseTargetId(id);

    if (targetId === null) {
        return noIndexMetadata;
    }

    const userAgent = (await headers()).get("user-agent") ?? "";
    if (!isMetadataCrawler(userAgent)) {
        return createPublicPageMetadata({
            title: "상품 상세",
            description: defaultSiteDescription,
            pathname: `/search/${targetId}`,
        });
    }

    const lookup = await lookupProduct(targetId);
    if (lookup.status !== "found" || !lookup.product.title.trim()) {
        return noIndexMetadata;
    }

    const imageUrl = lookup.product.imageUrls
        .map(normalizeProductImageUrl)
        .find((url): url is string => url !== null);

    return createPublicPageMetadata({
        title: lookup.product.title.trim(),
        description: lookup.product.description?.trim() || defaultSiteDescription,
        pathname: `/search/${targetId}`,
        imageUrl,
    });
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const targetId = parseTargetId(id);
    if (targetId === null) notFound();

    const requestHeaders = await headers();
    const userAgent = requestHeaders.get("user-agent") ?? "";
    const isCrawler = isMetadataCrawler(userAgent);

    // 일반 브라우저는 상세 컴포넌트가 API를 조회하고, 크롤러만 서버에서 상품을 조회한다.
    const lookup = isCrawler ? await lookupProduct(targetId) : null;
    if (lookup?.status === "not-found") {
        notFound();
    }

    return (
        <>
            {lookup?.status === "found" && <ProductStructuredData product={lookup.product} />}
            <SearchProductDetailPage key={targetId} targetId={targetId} />
        </>
    );
}
