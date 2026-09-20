"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { authApi } from "@/features/auth/api/authApi";
import type { SignUpRequest } from "@/features/auth/types";
import { signUpSchema, type SignUpFormValues } from "@/features/auth/schemas/authSchema";

const inputClassName =
    "border-border bg-background h-12 w-full rounded-full border px-5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary disabled:cursor-not-allowed disabled:opacity-60";

export default function SignupPage() {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<SignUpFormValues, unknown, SignUpRequest>({
        resolver: zodResolver(signUpSchema),
        defaultValues: { name: "", nickname: "", phone: "", email: "", password: "" },
    });
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const onSubmit = async (params: SignUpRequest) => {
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const result = await authApi.authSignUp(params);

            if (result.data.success) {
                setSuccessMessage("회원가입이 완료되었습니다.");
                reset();
                return;
            }

            setErrorMessage(result.data.message);
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        }
    };

    return (
        <main className="bg-muted/20 flex flex-1 items-center justify-center px-6 py-14 lg:px-8">
            <section aria-labelledby="page-title" className="w-full max-w-[470px]">
                <div className="mb-10 text-center">
                    <p className="text-muted-foreground text-sm font-semibold">
                        AI와 함께하는 똑똑한 중고거래
                    </p>
                    <p className="text-primary mt-2 text-4xl font-bold tracking-tight">지금이니?</p>
                </div>

                <div className="border-border bg-background rounded-2xl border p-7 shadow-xl shadow-black/5 sm:p-10">
                    <h1 id="page-title" className="mb-7 text-3xl font-bold tracking-tight">
                        회원가입
                    </h1>

                    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <fieldset disabled={isSubmitting} className="space-y-4">
                            <div>
                                <label className="sr-only" htmlFor="name">
                                    이름
                                </label>
                                <input
                                    id="name"
                                    {...register("name")}
                                    aria-invalid={Boolean(errors.name)}
                                    aria-describedby={errors.name ? "name-error" : undefined}
                                    type="text"
                                    autoComplete="name"
                                    placeholder="이름"
                                    className={inputClassName}
                                />
                                {errors.name ? (
                                    <p
                                        id="name-error"
                                        role="alert"
                                        className="text-destructive mt-1 text-sm"
                                    >
                                        {errors.name.message}
                                    </p>
                                ) : null}
                            </div>

                            <div>
                                <label className="sr-only" htmlFor="nickname">
                                    닉네임
                                </label>
                                <input
                                    id="nickname"
                                    {...register("nickname")}
                                    aria-invalid={Boolean(errors.nickname)}
                                    aria-describedby={
                                        errors.nickname ? "nickname-error" : undefined
                                    }
                                    type="text"
                                    placeholder="닉네임"
                                    className={inputClassName}
                                />
                                {errors.nickname ? (
                                    <p
                                        id="nickname-error"
                                        role="alert"
                                        className="text-destructive mt-1 text-sm"
                                    >
                                        {errors.nickname.message}
                                    </p>
                                ) : null}
                            </div>

                            <div>
                                <label className="sr-only" htmlFor="phone">
                                    휴대폰 번호 (선택)
                                </label>
                                <input
                                    id="phone"
                                    {...register("phone")}
                                    aria-invalid={Boolean(errors.phone)}
                                    aria-describedby={errors.phone ? "phone-error" : undefined}
                                    type="tel"
                                    autoComplete="tel"
                                    placeholder="휴대폰 번호 (선택)"
                                    className={inputClassName}
                                />
                                {errors.phone ? (
                                    <p
                                        id="phone-error"
                                        role="alert"
                                        className="text-destructive mt-1 text-sm"
                                    >
                                        {errors.phone.message}
                                    </p>
                                ) : null}
                            </div>

                            <div>
                                <label className="sr-only" htmlFor="email">
                                    이메일
                                </label>
                                <input
                                    id="email"
                                    {...register("email")}
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby={errors.email ? "email-error" : undefined}
                                    type="email"
                                    autoComplete="email"
                                    placeholder="이메일"
                                    className={inputClassName}
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
                                <label className="sr-only" htmlFor="password">
                                    비밀번호
                                </label>
                                <input
                                    id="password"
                                    {...register("password")}
                                    aria-invalid={Boolean(errors.password)}
                                    aria-describedby={
                                        errors.password ? "password-error" : undefined
                                    }
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="비밀번호"
                                    className={inputClassName}
                                />
                                {errors.password ? (
                                    <p
                                        id="password-error"
                                        role="alert"
                                        className="text-destructive mt-1 text-sm"
                                    >
                                        {errors.password.message}
                                    </p>
                                ) : null}
                            </div>
                        </fieldset>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 h-12 w-full rounded-full text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? "가입 중..." : "회원가입"}
                        </button>
                    </form>

                    {successMessage ? (
                        <p role="status" className="mt-5 text-center text-sm text-green-600">
                            {successMessage}
                        </p>
                    ) : null}
                    {errorMessage ? (
                        <p role="alert" className="text-destructive mt-5 text-center text-sm">
                            {errorMessage}
                        </p>
                    ) : null}

                    <p className="text-muted-foreground mt-6 text-center text-sm">
                        이미 계정이 있으신가요?{" "}
                        <Link
                            href="/login"
                            className="text-foreground font-semibold hover:underline"
                        >
                            로그인
                        </Link>
                    </p>
                </div>
            </section>
        </main>
    );
}
