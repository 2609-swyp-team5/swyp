import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

export type Category = {
    id: number;
    name: string;
    parentId: number | null;
    leaf: boolean;
};

const getCategories = () => api.get<ApiResponse<Category[]>>("/categories");

export const categoryApi = {
    getCategories,
};
