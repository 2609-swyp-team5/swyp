import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

export type Category = {
    id: number;
    name: string;
    parentId: number | null;
    leaf: boolean;
};

export type CategoryOptionType =
    "SINGLE_SELECT" | "SINGLE_ROUND" | "TEXT_FIELD" | "DATE_TEXT_FIELD";

export type CategoryOptionValue = {
    valueId: number;
    value: string;
    placeholder?: string;
    maxLength?: number;
};

export type CategoryOptionChild = {
    groupId: string;
    name: string;
    type: CategoryOptionType;
    values: CategoryOptionValue[];
};

/** 카테고리별 추가 항목(사이즈·용량·사용기한 등, 번개장터 등록 화면 기준). 항목마다 값 하나를 고른다. */
export type CategoryOptionGroup = {
    groupId: string;
    name: string;
    title: string;
    required: boolean;
    tooltip?: string;
    guide?: string[];
    children: CategoryOptionChild[];
};

const getCategories = () => api.get<ApiResponse<Category[]>>("/categories");

const getCategoryOptions = (categoryId: number) =>
    api.get<ApiResponse<CategoryOptionGroup[]>>(`/categories/${categoryId}/options`);

export const categoryApi = {
    getCategories,
    getCategoryOptions,
};
