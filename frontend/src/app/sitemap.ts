import type { MetadataRoute } from "next";

import { siteOrigin, siteUrl } from "@/common/lib/siteUrl";
import { searchApi } from "@/features/search/api/searchApi";

const productLimit = 100;

export const revalidate = 3600;

const staticEntries: MetadataRoute.Sitemap = [
    {
        url: siteUrl,
        changeFrequency: "weekly",
        priority: 1,
    },
    {
        url: new URL("/home", siteOrigin).toString(),
        changeFrequency: "daily",
        priority: 0.8,
    },
    {
        url: new URL("/search", siteOrigin).toString(),
        changeFrequency: "daily",
        priority: 0.8,
    },
];

async function getOnSaleProductEntries(): Promise<MetadataRoute.Sitemap> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const { data } = await searchApi.searchList(
            {
                status: "ON_SALE",
                sort: "LATEST",
                size: productLimit,
            },
            controller.signal,
        );

        if (!data.success) {
            return [];
        }

        const seenIds = new Set<number>();

        return data.data.content
            .filter((product) => {
                if (seenIds.has(product.id)) {
                    return false;
                }

                seenIds.add(product.id);
                return product.status === "ON_SALE";
            })
            .map((product) => ({
                url: new URL(`/search/${product.id}`, siteOrigin).toString(),
                lastModified: product.createdAt,
                changeFrequency: "daily" as const,
                priority: 0.6,
            }));
    } catch {
        return [];
    } finally {
        clearTimeout(timeout);
    }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    return [...staticEntries, ...(await getOnSaleProductEntries())];
}
