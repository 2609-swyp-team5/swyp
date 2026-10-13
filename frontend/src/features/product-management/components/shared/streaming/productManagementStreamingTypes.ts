import type { ReactNode } from "react";

export type StreamingQueryState<T> = {
    data: T | null | undefined;
    error: Error | null;
    isPending: boolean;
    isFetching: boolean;
    refetch: () => Promise<unknown>;
};

export type ProductManagementStreamingSectionProps<T> = {
    step: 3 | 4 | 5 | 6;
    title: string;
    query: StreamingQueryState<T>;
    getReadyMessage: (data: T) => ReactNode;
};
