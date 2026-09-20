"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse } from "@react-oauth/google";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { useAuthStore } from "@/features/auth/store/authStore";
import type { LoginRequest } from "@/features/auth/types";

const inputClassName =
    "border-border bg-background h-12 w-full rounded-lg border px-5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary disabled:cursor-not-allowed disabled:opacity-60";

const secondaryLinkClassName =
    "bg-muted text-foreground hover:bg-muted/80 flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition-colors";

export default function LoginPage() {
    const router = useRouter();
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const login = useAuthStore((state) => state.login);
    const socialLogin = useAuthStore((state) => state.socialLogin);
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const googleButtonContainer = useRef<HTMLDivElement>(null);
    const [googleButtonWidth, setGoogleButtonWidth] = useState(0);

    useEffect(() => {
        const container = googleButtonContainer.current;
        if (!container) return;

        const observer = new ResizeObserver(([entry]) => {
            setGoogleButtonWidth(Math.min(400, Math.floor(entry.contentRect.width)));
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, [isInitialized, isLoggedIn, googleClientId]);

    useEffect(() => {
        if (isInitialized && isLoggedIn) {
            router.replace("/");
        }
    }, [isInitialized, isLoggedIn, router]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setErrorMessage("");

        const formData = new FormData(event.currentTarget);
        const params: LoginRequest = {
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
        };

        try {
            const result = await login(params);

            if (result.success) {
                return;
            }

            setErrorMessage(result.message);
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    // 구글 ID 토큰을 백엔드에 전달해 서비스 로그인 처리
    const handleGoogleSuccess = async (response: CredentialResponse) => {
        if (!response.credential) {
            setErrorMessage("구글 인증 정보를 받지 못했습니다.");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage("");

        try {
            const result = await socialLogin({
                provider: "GOOGLE",
                token: response.credential,
            });

            if (!result.success) {
                setErrorMessage(result.message);
            }
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isInitialized || isLoggedIn) {
        return null;
    }

    return (
        <main className="bg-muted/20 flex flex-1 items-center justify-center px-6 py-14 lg:px-8">
            <section aria-labelledby="page-title" className="w-full max-w-[500px]">
                <div className="mb-10 text-center">
                    <p className="text-muted-foreground text-sm font-semibold">
                        AI와 함께하는 똑똑한 중고거래
                    </p>
                    <p className="text-primary mt-2 text-4xl font-bold tracking-tight">지금이니?</p>
                </div>

                <div className="border-border bg-background rounded-2xl border p-7 shadow-xl shadow-black/5 sm:p-10">
                    <h1 id="page-title" className="mb-10 text-3xl font-bold tracking-tight">
                        로그인
                    </h1>

                    <form noValidate onSubmit={handleSubmit} className="space-y-3">
                        <fieldset disabled={isSubmitting} className="space-y-3">
                            <label className="sr-only" htmlFor="email">
                                이메일
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                placeholder="이메일"
                                className={inputClassName}
                            />

                            <label className="sr-only" htmlFor="password">
                                비밀번호
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                placeholder="비밀번호"
                                className={inputClassName}
                            />
                        </fieldset>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 w-full rounded-lg text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? "로그인 중..." : "로그인"}
                        </button>
                    </form>

                    {googleClientId ? (
                        <div
                            ref={googleButtonContainer}
                            className="mx-auto mt-5 min-h-10 w-full max-w-[400px]"
                        >
                            <GoogleOAuthProvider clientId={googleClientId}>
                                {isSubmitting ? (
                                    <p
                                        role="status"
                                        className="flex h-10 items-center justify-center"
                                    >
                                        로그인 중...
                                    </p>
                                ) : googleButtonWidth > 0 ? (
                                    <GoogleLogin
                                        size="large"
                                        width={googleButtonWidth}
                                        onSuccess={handleGoogleSuccess}
                                        onError={() => {
                                            setErrorMessage("구글 인증에 실패했습니다.");
                                        }}
                                    />
                                ) : null}
                            </GoogleOAuthProvider>
                        </div>
                    ) : (
                        <p className="mt-5 text-center text-sm">구글 로그인 설정이 필요합니다.</p>
                    )}

                    {errorMessage ? (
                        <p role="alert" className="text-destructive mt-5 text-center text-sm">
                            {errorMessage}
                        </p>
                    ) : null}

                    <div className="mx-auto mt-7 w-full max-w-[400px] space-y-3">
                        <Link href="/home" className={secondaryLinkClassName}>
                            비회원 로그인
                        </Link>
                        <Link href="/signup" className={secondaryLinkClassName}>
                            회원가입
                        </Link>
                    </div>

                    <Link
                        href="/account/recovery"
                        className="text-muted-foreground hover:text-foreground mt-5 inline-block text-sm hover:underline"
                    >
                        아이디/비밀번호 찾기
                    </Link>
                </div>
            </section>
        </main>
    );
}
