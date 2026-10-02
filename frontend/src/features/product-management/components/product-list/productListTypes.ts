import type { ReactNode } from "react";

export type ProductListItemData = {
    id: string;
    title: string;
    price: number;
    categoryName: string;
    thumbnailUrl: string | null;
    badgeLabel: string | null;
    badgeTone: "primary" | "dark" | "muted" | "warning";
    metaLabel: string;
};

export type ProductListTab = {
    key: string;
    label: string;
    listTitle?: string;
    filter: (item: ProductListItemData) => boolean;
};

export type ProductListShellProps = {
    eyebrow: string;
    title: string;
    tabs: ProductListTab[];
    items: ProductListItemData[];
    isLoading: boolean;
    errorMessage?: string;
    emptyMessage: string;
    listTitle: string;
    detailRenderer?: (item: ProductListItemData) => ReactNode;
    primaryAction?: {
        label: string;
        href: string;
    };
};
