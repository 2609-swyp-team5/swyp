"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Eye, EyeOff } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { Checkbox } from "@/common/components/ui/Checkbox";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { SocialLoginButtons } from "@/features/auth/components/social/SocialLoginButtons";
import { useLoginMutation } from "@/features/auth/hooks/mutations/useLoginMutation";
import { useSocialLogin } from "@/features/auth/hooks/useSocialLogin";
import { useAuthStore } from "@/features/auth/store/authStore";
import type { LoginRequest } from "@/features/auth/types";
import { loginSchema } from "@/features/auth/schemas/authSchema";

export default function LoginPage() {
    const router = useRouter();
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const [errorMessage, setErrorMessage] = useState("");
    const [showPassword, setShowPassword] = useState(false);
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
        defaultValues: { email: "", password: "" },
    });

    const isBusy = isSubmitting || isPending || socialLogin.isBusy;

    useEffect(() => {
        if (isInitialized && isLoggedIn) {
            router.replace("/home");
        }
    }, [isInitialized, isLoggedIn, router]);

    const onSubmit = (params: LoginRequest) => {
        setErrorMessage("");
        login(params);
    };

    if (!isInitialized || isLoggedIn) {
        return null;
    }

    return (
        <main className="bg-background flex flex-1 justify-center px-6 pt-16 pb-20 sm:pt-28">
            <section aria-labelledby="page-title" className="w-full max-w-[1016px]">
                <div className="mb-16 text-center sm:mb-20">
                    <p className="text-base font-semibold sm:text-xl">
                        AI와 함께하는 똑똑한 중고거래
                    </p>
                    <p className="text-primary mt-2 text-5xl font-bold tracking-tight sm:text-6xl">
                        지금이니?
                    </p>
                </div>

                <h1 id="page-title" className="mb-10 text-3xl font-bold tracking-tight">
                    로그인
                </h1>

                <form id="login-form" noValidate onSubmit={handleSubmit(onSubmit)}>
                    <fieldset disabled={isBusy} className="space-y-5">
                        <div>
                            <Label className="mb-2 text-sm font-semibold" htmlFor="email">
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
                                className="bg-background h-10 rounded-md px-5 text-sm"
                            />
                            {errors.email ? (
                                <p
                                    id="email-error"
                                    role="alert"
                                    className="text-destructive mt-1 text-sm"
                                >
                                    {errors.email.message}
                                </p>
                            ) : null}
                        </div>

                        <div>
                            <Label className="mb-2 text-sm font-semibold" htmlFor="password">
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
                                    className="bg-background h-10 rounded-md pr-12 pl-5 text-sm"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                                    aria-pressed={showPassword}
                                    onClick={() => setShowPassword((value) => !value)}
                                    className="text-muted-foreground absolute top-1 right-2"
                                >
                                    {showPassword ? <Eye /> : <EyeOff />}
                                </Button>
                            </div>
                            {errors.password ? (
                                <p
                                    id="password-error"
                                    role="alert"
                                    className="text-destructive mt-1 text-sm"
                                >
                                    {errors.password.message}
                                </p>
                            ) : (
                                <p
                                    id="password-hint"
                                    className="text-destructive mt-2 flex items-center gap-2 text-xs"
                                >
                                    <CircleAlert aria-hidden="true" className="size-3 shrink-0" />
                                    비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.
                                </p>
                            )}
                        </div>
                    </fieldset>
                </form>

                <div className="mt-4 flex items-center gap-2">
                    <Checkbox
                        id="remember-login"
                        defaultChecked
                        disabled={isBusy}
                        className="data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-background size-6"
                    />
                    <Label htmlFor="remember-login" className="text-muted-foreground text-base">
                        로그인 상태 유지
                    </Label>
                </div>
                <Link
                    href="/account/recovery"
                    className="text-muted-foreground hover:text-foreground mt-2 inline-block text-base underline underline-offset-2"
                >
                    비밀번호 찾기
                </Link>
                <Link
                    href="/signup"
                    className="text-primary mt-2 ml-6 inline-block text-base underline underline-offset-2"
                >
                    회원가입
                </Link>

                <SocialLoginButtons {...socialLogin} isBusy={isBusy} />

                {errorMessage ? (
                    <p role="alert" className="text-destructive mt-5 text-center text-sm">
                        {errorMessage}
                    </p>
                ) : null}

                <div className="mt-14 flex justify-end gap-5">
                    <Button
                        asChild
                        variant="secondary"
                        className="text-muted-foreground h-14 flex-1 rounded-full bg-[#dedee6] text-lg font-bold sm:w-[216px] sm:flex-none"
                    >
                        <Link href="/home">비회원 로그인</Link>
                    </Button>
                    <Button
                        type="submit"
                        form="login-form"
                        disabled={isBusy}
                        className="h-14 flex-1 rounded-full text-lg font-bold sm:w-[216px] sm:flex-none"
                    >
                        {isBusy ? "로그인 중..." : "로그인"}
                    </Button>
                </div>
            </section>
        </main>
    );
}
