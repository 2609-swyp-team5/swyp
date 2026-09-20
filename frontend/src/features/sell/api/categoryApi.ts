import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

export type Category = {
    id: number;
    name: string;
    parentId: number | null;
};

export const categoryApi = {
    getCategories: () => api.get<ApiResponse<Category[]>>("/categories"),
};
