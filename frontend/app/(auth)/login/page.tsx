"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/common/components/ui/button";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { authApi } from "@/features/auth/api/authApi";
import type { LoginRequest } from "@/features/auth/types";

const inputClassName =
    "mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

export default function LoginPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;

        const formData = new FormData(event.currentTarget);
        const params: LoginRequest = {
            email: String(formData.get("email") ?? "").trim(),
            password: String(formData.get("password") ?? ""),
        };

        setIsSubmitting(true);
        setIsComplete(false);
        setErrorMessage("");

        try {
            const result = await authApi.login(params);

            if (result.data.success) {
                setIsComplete(true);
            } else {
                setErrorMessage(result.data.message);
            }
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="bg-muted/30 flex flex-1 items-center justify-center px-4 py-12">
            <section
                aria-labelledby="login-title"
                className="bg-card w-full max-w-md rounded-2xl border p-6 shadow-sm sm:p-8"
            >
                <h1 id="login-title" className="text-2xl font-semibold tracking-tight">
                    로그인
                </h1>
                <p className="text-muted-foreground mt-2 text-sm">
                    이메일과 비밀번호를 입력해 주세요.
                </p>
                <form onSubmit={handleSubmit} className="mt-8" aria-busy={isSubmitting}>
                    <fieldset disabled={isSubmitting} className="space-y-5">
                        <legend className="sr-only">로그인 정보</legend>
                        <div>
                            <label htmlFor="email" className="text-sm font-medium">
                                이메일
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="username"
                                placeholder="name@example.com"
                                required
                                className={inputClassName}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="text-sm font-medium">
                                비밀번호
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                pattern=".*\S.*"
                                title="비밀번호를 입력해 주세요."
                                required
                                className={inputClassName}
                            />
                        </div>
                        {isComplete && (
                            <p role="status" className="bg-muted rounded-lg p-4 text-sm">
                                로그인에 성공했습니다.
                            </p>
                        )}
                        {errorMessage && (
                            <p role="alert" className="text-destructive text-sm">
                                {errorMessage}
                            </p>
                        )}
                        <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
                            {isSubmitting ? "로그인 중..." : "로그인"}
                        </Button>
                    </fieldset>
                </form>
            </section>
        </main>
    );
}
