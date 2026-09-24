"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleAlert, Eye, EyeOff } from "lucide-react";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/common/components/ui/AlertDialog";
import { Button } from "@/common/components/ui/Button";
import { Checkbox } from "@/common/components/ui/Checkbox";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { SocialLoginButtons } from "@/features/auth/components/social/SocialLoginButtons";
import { PasswordResetModal } from "@/features/auth/components/PasswordResetModal";
import { useLoginMutation } from "@/features/auth/hooks/mutations/useLoginMutation";
import { useSocialLogin } from "@/features/auth/hooks/useSocialLogin";
import { useAuthStore } from "@/features/auth/store/authStore";
import type { LoginRequest } from "@/features/auth/types";
import { loginSchema } from "@/features/auth/schemas/authSchema";

const SAVED_EMAIL_KEY = "savedLoginEmail";

export default function LoginPage() {
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
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginRequest>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: savedEmail, password: "" },
    });

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
                    <div className="text-center">
                        <p className="typography-body-medium leading-[30px] font-semibold text-[#464646]">
                            AI와 함께하는 똑똑한 중고거래
                        </p>
                        <p className="typography-heading-01 text-primary mt-2.5 dark:text-[#6653fb]">
                            지금이니?
                        </p>
                    </div>

                    <h1
                        id="page-title"
                        className="typography-heading-03 mt-20 leading-[42px] font-bold text-[#363636]"
                    >
                        로그인
                    </h1>

                    <form
                        id="login-form"
                        noValidate
                        onSubmit={handleSubmit(onSubmit)}
                        className="mt-[30px]"
                    >
                        <fieldset disabled={isBusy} className="space-y-5">
                            <div>
                                <Label
                                    className="typography-body-medium mb-2 text-[length:var(--type-body-medium-size)] leading-[30px] font-semibold text-[#363636]"
                                    htmlFor="email"
                                >
                                    이메일
                                </Label>
                                <Input
                                    id="email"
                                    {...register("email")}
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby={errors.email ? "email-error" : undefined}
                                    type="email"
                                    autoComplete="email"
                                    placeholder="이메일 주소를 입력해주세요"
                                    className="bg-background h-[41px] rounded-sm border-[#d3d3d3] px-5 text-base leading-[25px] font-normal tracking-normal text-[#363636] placeholder:text-[#6b6c7b] md:text-base dark:bg-white"
                                />
                                {errors.email ? (
                                    <p
                                        id="email-error"
                                        role="alert"
                                        className="mt-2 text-[13px] leading-5 text-[#fa503d]"
                                    >
                                        {errors.email.message}
                                    </p>
                                ) : null}
                            </div>

                            <div>
                                <Label
                                    className="typography-body-medium mb-2 text-[length:var(--type-body-medium-size)] leading-[30px] font-semibold text-[#363636]"
                                    htmlFor="password"
                                >
                                    비밀번호
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        {...register("password")}
                                        aria-invalid={Boolean(errors.password)}
                                        aria-describedby={
                                            errors.password ? "password-error" : "password-hint"
                                        }
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        placeholder="8자 이상, 영문/숫자 조합"
                                        className="bg-background h-9 rounded-sm border-[#d3d3d3] pr-12 pl-5 text-base leading-[25px] font-normal tracking-normal text-[#363636] placeholder:text-[#6b6c7b] md:text-base dark:bg-white"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={
                                            showPassword ? "비밀번호 숨기기" : "비밀번호 표시"
                                        }
                                        aria-pressed={showPassword}
                                        onClick={() => setShowPassword((value) => !value)}
                                        className="absolute top-[5px] right-2 text-[#6b6c7b]"
                                    >
                                        {showPassword ? (
                                            <Eye className="size-5" />
                                        ) : (
                                            <EyeOff className="size-5" />
                                        )}
                                    </Button>
                                </div>
                                {errors.password ? (
                                    <p
                                        id="password-error"
                                        role="alert"
                                        className="mt-2 text-[13px] leading-5 text-[#fa503d]"
                                    >
                                        {errors.password.message}
                                    </p>
                                ) : (
                                    <p
                                        id="password-hint"
                                        className="mt-2 flex items-center gap-2.5 text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#fa503d]"
                                    >
                                        <CircleAlert
                                            aria-hidden="true"
                                            className="size-[15px] shrink-0"
                                        />
                                        비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.
                                    </p>
                                )}
                            </div>
                        </fieldset>
                    </form>

                    <Button
                        type="submit"
                        form="login-form"
                        disabled={isBusy}
                        className="typography-body-medium bg-primary text-primary-foreground mt-[60px] h-[70px] w-full rounded-lg text-lg leading-[30px] font-semibold dark:bg-[#6653fb] dark:text-white"
                    >
                        {isBusy ? "로그인 중..." : "로그인하기"}
                    </Button>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 text-base leading-[25px] font-semibold tracking-[0.5px]">
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="remember-login"
                                    checked={rememberEmail}
                                    onCheckedChange={handleRememberEmailChange}
                                    disabled={isBusy}
                                    className="size-6 border-[#d3d3d3] bg-white data-[state=checked]:border-[#272727] data-[state=checked]:bg-[#272727] data-[state=checked]:text-white dark:bg-white dark:data-[state=checked]:bg-[#272727]"
                                />
                                <Label
                                    htmlFor="remember-login"
                                    className="text-base leading-[25px] font-semibold text-[#6b6c7b]"
                                >
                                    아이디 저장
                                </Label>
                            </div>
                            <span
                                aria-hidden="true"
                                className="hidden h-6 w-px bg-[#d3d3d3] sm:block"
                            />
                            <PasswordResetModal />
                        </div>
                        <p className="flex items-center gap-[6px] px-2.5 text-[#6b6c7b]">
                            <span>회원이 아니신가요?</span>
                            <Link
                                href="/signup"
                                className="text-primary underline underline-offset-2 dark:text-[#6653fb]"
                            >
                                회원가입
                            </Link>
                        </p>
                    </div>

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

                    <AlertDialog
                        open={Boolean(errorMessage)}
                        onOpenChange={(open) => {
                            if (!open) setErrorMessage("");
                        }}
                    >
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>로그인 오류</AlertDialogTitle>
                                <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogAction>확인</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </section>
            </div>
        </main>
    );
}
