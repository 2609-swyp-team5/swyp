import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL;

if (!baseURL?.trim()) {
    throw new Error(
        "NEXT_PUBLIC_API_URL이 설정되지 않았습니다. frontend의 환경변수 파일 또는 빌드 환경변수를 확인해 주세요.",
    );
}

export const apiClient = axios.create({
    baseURL,
    timeout: 10_000,
});
