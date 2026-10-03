import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type { MyProductsParams, MyProductsResponse } from "../types";

const myProducts = (params: MyProductsParams, signal?: AbortSignal) =>
    api.get<ApiResponse<MyProductsResponse>>("/products/me", { params, signal });

export const myApi = {
    myProducts,
};
