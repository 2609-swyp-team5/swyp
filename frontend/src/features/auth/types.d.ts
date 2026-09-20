// 회원가입에 필요한 입력 정보
export interface SignUpRequest {
    email: string;
    phone: string | null;
    password: string;
    name: string;
    nickname: string;
}

// 회원가입 성공 시 반환되는 회원 정보
export interface SignUpResponse {
    memberId: number;
    email: string;
    nickname: string;
    name: string;
    phone: string | null;
    role: "USER" | "ADMIN";
    status: "ACTIVE" | "SUSPENDED" | "DELETED";
}

// 이메일 로그인에 필요한 인증 정보
export interface LoginRequest {
    email: string;
    password: string;
}

// 로그인 성공 시 반환되는 액세스 토큰
export interface LoginResponse {
    accessToken: string;
}

// 토큰 재발급 성공 시 반환되는 액세스 토큰
export interface TokenResponse {
    accessToken: string;
}
