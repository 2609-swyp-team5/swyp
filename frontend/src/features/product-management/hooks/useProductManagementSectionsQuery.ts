"use client";

import { useQuery } from "@tanstack/react-query";

import {
    getProductCompetitionMock,
    getProductMarketAnalysisMock,
    getProductPriceTrendMock,
    getProductTransactionsMock,
    getProductValuationForecastMock,
} from "../api/productManagementMockApi";
import type { ProductManagementPerspective } from "../types";

const isValidProductId = (productId: number) => Number.isInteger(productId) && productId > 0;

const sectionQueryOptions = {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
};

export function useProductManagementSectionsQuery(
    productId: number,
    options?: {
        competitionEnabled?: boolean;
        perspective?: ProductManagementPerspective;
    },
) {
    const enabled = isValidProductId(productId);
    const competitionEnabled = enabled && (options?.competitionEnabled ?? true);
    const perspective = options?.perspective ?? "SELL";

    const section2 = useQuery({
        ...sectionQueryOptions,
        queryKey: ["product-management", "market-analysis", perspective, productId] as const,
        queryFn: () => getProductMarketAnalysisMock(productId, perspective),
        enabled,
    });

    const section3 = useQuery({
        ...sectionQueryOptions,
        queryKey: ["product-management", "price-trend", productId] as const,
        queryFn: () => getProductPriceTrendMock(productId),
        enabled,
    });

    const section4 = useQuery({
        ...sectionQueryOptions,
        queryKey: ["product-management", "valuation-forecast", productId] as const,
        queryFn: () => getProductValuationForecastMock(productId),
        enabled,
    });

    const section5 = useQuery({
        ...sectionQueryOptions,
        queryKey: ["product-management", "transactions", productId] as const,
        queryFn: () => getProductTransactionsMock(productId),
        enabled,
    });

    const section6 = useQuery({
        ...sectionQueryOptions,
        queryKey: ["product-management", "competition", perspective, productId] as const,
        queryFn: () => getProductCompetitionMock(productId, perspective),
        enabled: competitionEnabled,
    });

    return { section2, section3, section4, section5, section6 };
}
