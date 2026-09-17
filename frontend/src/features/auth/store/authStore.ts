"use client";

import { create } from "zustand";

interface AuthStore {
    isLoggedIn: boolean;
    login: () => void;
    logout: () => void;
}

// 실제 인증 연동 전, 로그인 UI 확인용 임시 스토어입니다.
export const useAuthStore = create<AuthStore>((set) => ({
    isLoggedIn: false,
    login: () => set({ isLoggedIn: true }),
    logout: () => set({ isLoggedIn: false }),
}));
