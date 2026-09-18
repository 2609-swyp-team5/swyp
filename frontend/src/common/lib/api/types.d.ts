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

export type ApiResponse<T> =
    | {
          success: true;
          message: string;
          data: T;
          error: null;
      }
    | ApiErrorResponse;
