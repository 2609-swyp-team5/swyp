export const isValidProductId = (productId: number) => Number.isInteger(productId) && productId > 0;

export const productManagementQueryDefaults = {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
} as const;
