import { isAxiosError } from "axios";

export interface ApiErrorResponse {
    status: number;
    message: string;
    traceId: string | null;
}

export function getApiErrorMessage(error: unknown): string {
    if (!isAxiosError<ApiErrorResponse>(error)) {
        return "요청 처리 중 오류가 발생했습니다.";
    }

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        return "요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
    }

    if (error.response) {
        const message = error.response.data?.message;

        return typeof message === "string" && message.trim()
            ? message
            : "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    }

    if (error.request || error.code === "ERR_NETWORK") {
        return "서버에 연결할 수 없습니다. 네트워크 연결을 확인해 주세요.";
    }

    return "요청 처리 중 오류가 발생했습니다.";
}
