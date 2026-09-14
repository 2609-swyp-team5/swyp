export interface SignUpRequest {
    email: string;
    phone: string | null;
    password: string;
    name: string;
    nickname: string;
}

export interface SignUpResponse {
    memberId: number;
    email: string;
    nickname: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
}
