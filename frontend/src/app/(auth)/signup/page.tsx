"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { authApi } from "@/features/auth/api/authApi";
import type { SignUpRequest } from "@/features/auth/types";

const inputClassName =
    "border-border bg-background h-12 w-full rounded-full border px-5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary disabled:cursor-not-allowed disabled:opacity-60";

export default function SignupPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        setIsSubmitting(true);
        setSuccessMessage("");
        setErrorMessage("");

        const formData = new FormData(form);
        const phone = String(formData.get("phone") ?? "");
        const params: SignUpRequest = {
            name: String(formData.get("name") ?? ""),
            nickname: String(formData.get("nickname") ?? ""),
            phone: phone || null,
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
        };

        try {
            const result = await authApi.authSignUp(params);

            if (result.data.success) {
                setSuccessMessage("회원가입이 완료되었습니다.");
                form.reset();
                return;
            }

            setErrorMessage(result.data.message);
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
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

                    <form noValidate onSubmit={handleSubmit} className="space-y-4">
                        <fieldset disabled={isSubmitting} className="space-y-4">
                            <label className="sr-only" htmlFor="name">
                                이름
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                autoComplete="name"
                                placeholder="이름"
                                className={inputClassName}
                            />

                            <label className="sr-only" htmlFor="nickname">
                                닉네임
                            </label>
                            <input
                                id="nickname"
                                name="nickname"
                                type="text"
                                placeholder="닉네임"
                                className={inputClassName}
                            />

                            <label className="sr-only" htmlFor="phone">
                                휴대폰 번호 (선택)
                            </label>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                autoComplete="tel"
                                placeholder="휴대폰 번호 (선택)"
                                className={inputClassName}
                            />

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
                                autoComplete="new-password"
                                placeholder="비밀번호"
                                className={inputClassName}
                            />
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
