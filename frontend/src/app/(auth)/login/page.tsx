"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { authApi } from "@/features/auth/api/authApi";
import type { LoginRequest } from "@/features/auth/types";

const inputClassName =
    "border-border bg-background h-12 w-full rounded-lg border px-5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary disabled:cursor-not-allowed disabled:opacity-60";

const secondaryLinkClassName =
    "bg-muted text-foreground hover:bg-muted/80 flex h-12 w-full items-center justify-center rounded-lg text-sm font-semibold transition-colors";

export default function LoginPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setSuccessMessage("");
        setErrorMessage("");

        const formData = new FormData(event.currentTarget);
        const params: LoginRequest = {
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
        };

        try {
            const result = await authApi.login(params);

            if (result.data.success) {
                setSuccessMessage("로그인에 성공했습니다.");
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

                    <div className="mt-7 space-y-3">
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
