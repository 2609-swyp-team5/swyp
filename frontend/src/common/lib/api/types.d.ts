export interface ApiError {
    status: string;
    code: string;
    details: { field: string; content: string }[] | null;
}

export interface ApiErrorResponse {
    success: false;
    message: string;
    data: null;
    error: ApiError;
}

// API 성공 응답 본문
export interface ApiSuccessResponse<T> {
    success: true;
    message: string;
    data: T;
    error: null;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
