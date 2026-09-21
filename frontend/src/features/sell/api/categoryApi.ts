import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

export type Category = {
    id: number;
    name: string;
    parentId: number | null;
};

const getCategories = async (): Promise<Category[]> => {
    const { data } = await api.get<ApiResponse<Category[]>>("/categories");

    if (!data.success) {
        throw new Error(data.message);
    }

    return data.data;
};

export const categoryApi = {
    getCategories,
};
