export interface PasswordChangeRequest {
    currentPassword: string;
    newPassword: string;
}

export interface MemberUpdateRequest {
    nickname: string;
    phone: string | null;
}

export interface MemberResponse {
    memberId: number;
    email: string | null;
    name: string;
    nickname: string;
    phone: string | null;
    profileImageUrl: string | null;
}
