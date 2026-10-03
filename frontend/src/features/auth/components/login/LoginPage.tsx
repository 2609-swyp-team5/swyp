"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { LoginForm } from "@/features/auth/components/login/LoginForm";
import { AuthHeading } from "@/features/auth/components/shared/AuthHeading";
import { AuthResultDialog } from "@/features/auth/components/shared/AuthResultDialog";
import { SocialLoginButtons } from "@/features/auth/components/social/SocialLoginButtons";
import { useLoginMutation } from "@/features/auth/hooks/mutations/useLoginMutation";
import { useSocialLogin } from "@/features/auth/hooks/useSocialLogin";
import { useAuthStore } from "@/features/auth/store/authStore";
import type { LoginRequest } from "@/features/auth/types";
import { loginSchema } from "@/features/auth/schemas/authSchema";

const SAVED_EMAIL_KEY = "savedLoginEmail";

export function LoginPage() {
    const router = useRouter();
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const [errorMessage, setErrorMessage] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [savedEmail] = useState(() => {
        try {
            return typeof window === "undefined"
                ? ""
                : (localStorage.getItem(SAVED_EMAIL_KEY) ?? "");
        } catch {
            return "";
        }
    });
    const [rememberEmail, setRememberEmail] = useState(Boolean(savedEmail));
    const socialLogin = useSocialLogin(setErrorMessage);
    const { mutate: login, isPending } = useLoginMutation({
        onError: (error) => setErrorMessage(getApiErrorMessage(error)),
    });
    const form = useForm<LoginRequest>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: savedEmail, password: "" },
    });
    const {
        formState: { isSubmitting },
    } = form;

    const isBusy = isSubmitting || isPending || socialLogin.isBusy;

    useEffect(() => {
        if (isInitialized && isLoggedIn) {
            router.replace("/home");
        }
    }, [isInitialized, isLoggedIn, router]);

    const onSubmit = (params: LoginRequest) => {
        setErrorMessage("");
        login(params, {
            onSuccess: () => {
                try {
                    if (rememberEmail) {
                        localStorage.setItem(SAVED_EMAIL_KEY, params.email);
                    } else {
                        localStorage.removeItem(SAVED_EMAIL_KEY);
                    }
                } catch {
                    // 이메일 저장 실패는 로그인 성공에 영향을 주지 않습니다.
                }
            },
        });
    };

    const handleRememberEmailChange = (checked: boolean | "indeterminate") => {
        setRememberEmail(checked === true);
        if (checked !== true) {
            try {
                localStorage.removeItem(SAVED_EMAIL_KEY);
            } catch {
                // 저장소 접근이 차단된 경우에도 체크 해제는 반영합니다.
            }
        }
    };

    if (!isInitialized || isLoggedIn) {
        return null;
    }

    return (
        <main className="bg-background flex-1 py-16 lg:py-28 dark:bg-white">
            <div className="layout-container">
                <section aria-labelledby="page-title" className="mx-auto w-full max-w-[840px]">
                    <AuthHeading title="로그인" />

                    <LoginForm
                        form={form}
                        onSubmit={onSubmit}
                        isBusy={isBusy}
                        showPassword={showPassword}
                        onPasswordVisibilityChange={setShowPassword}
                        rememberEmail={rememberEmail}
                        onRememberEmailChange={handleRememberEmailChange}
                    />

                    <div className="mt-[60px] border-t border-[#d3d3d3] pt-5">
                        <SocialLoginButtons {...socialLogin} isBusy={isBusy} />
                        <div className="mt-6 flex justify-end">
                            <Link
                                href="/home"
                                className="group hover:text-primary focus-visible:text-primary inline-flex items-center gap-1.5 text-base leading-[25px] font-semibold text-[#6b6c7b]"
                            >
                                <span className="underline underline-offset-4">
                                    비회원으로 둘러보기
                                </span>
                                <ArrowRight
                                    aria-hidden="true"
                                    className="size-4 transition-transform group-hover:translate-x-0.5"
                                />
                            </Link>
                        </div>
                    </div>

                    <AuthResultDialog
                        open={Boolean(errorMessage)}
                        onOpenChange={(open) => {
                            if (!open) setErrorMessage("");
                        }}
                        title="로그인 오류"
                        message={errorMessage}
                    />
                </section>
            </div>
        </main>
    );
}
