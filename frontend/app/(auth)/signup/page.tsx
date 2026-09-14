"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/common/components/ui/button";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { authApi } from "@/features/auth/api/authApi";
import type { SignUpRequest } from "@/features/auth/types";

const inputClassName =
    "mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

export default function SignupPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;

        const formData = new FormData(event.currentTarget);
        const params: SignUpRequest = {
            email: String(formData.get("email") ?? "").trim(),
            phone: String(formData.get("phone") ?? "").trim() || null,
            password: String(formData.get("password") ?? ""),
            name: String(formData.get("name") ?? "").trim(),
            nickname: String(formData.get("nickname") ?? "").trim(),
        };

        setIsSubmitting(true);
        setErrorMessage("");

        try {
            const result = await authApi.signUp(params);

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
                aria-labelledby="signup-title"
                className="bg-card w-full max-w-md rounded-2xl border p-6 shadow-sm sm:p-8"
            >
                <h1 id="signup-title" className="text-2xl font-semibold tracking-tight">
                    회원가입
                </h1>

                {isComplete ? (
                    <p role="status" className="bg-muted mt-6 rounded-lg p-4 text-sm leading-6">
                        회원가입이 완료되었습니다.
                    </p>
                ) : (
                    <>
                        <p className="text-muted-foreground mt-2 text-sm">
                            휴대폰 번호를 제외한 모든 항목은 필수입니다.
                        </p>
                        <form onSubmit={handleSubmit} className="mt-8" aria-busy={isSubmitting}>
                            <fieldset disabled={isSubmitting} className="space-y-5">
                                <legend className="sr-only">회원가입 정보</legend>
                                <div>
                                    <label htmlFor="email" className="text-sm font-medium">
                                        이메일
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="name@example.com"
                                        required
                                        className={inputClassName}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="text-sm font-medium">
                                        휴대폰 번호 (선택)
                                    </label>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        autoComplete="tel-national"
                                        placeholder="01012345678"
                                        pattern="01[016789][0-9]{7,8}"
                                        maxLength={11}
                                        title="휴대폰 번호를 하이픈 없이 입력해 주세요."
                                        aria-describedby="phone-hint"
                                        className={inputClassName}
                                    />
                                    <p
                                        id="phone-hint"
                                        className="text-muted-foreground mt-2 text-xs"
                                    >
                                        하이픈(-) 없이 입력해 주세요.
                                    </p>
                                </div>
                                <div>
                                    <label htmlFor="password" className="text-sm font-medium">
                                        비밀번호
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        minLength={8}
                                        maxLength={64}
                                        pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,64}"
                                        title="영문과 숫자를 포함해 8~64자로 입력해 주세요."
                                        aria-describedby="password-hint"
                                        required
                                        className={inputClassName}
                                    />
                                    <p
                                        id="password-hint"
                                        className="text-muted-foreground mt-2 text-xs"
                                    >
                                        영문과 숫자를 포함한 8~64자
                                    </p>
                                </div>
                                <div>
                                    <label htmlFor="name" className="text-sm font-medium">
                                        이름
                                    </label>
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        autoComplete="name"
                                        maxLength={50}
                                        pattern=".*\S.*"
                                        title="공백이 아닌 이름을 입력해 주세요."
                                        required
                                        className={inputClassName}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="nickname" className="text-sm font-medium">
                                        닉네임
                                    </label>
                                    <input
                                        id="nickname"
                                        name="nickname"
                                        type="text"
                                        autoComplete="nickname"
                                        maxLength={30}
                                        pattern=".*\S.*"
                                        title="공백이 아닌 닉네임을 입력해 주세요."
                                        required
                                        className={inputClassName}
                                    />
                                </div>
                                {errorMessage && (
                                    <p role="alert" className="text-destructive text-sm">
                                        {errorMessage}
                                    </p>
                                )}
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="h-11 w-full"
                                >
                                    {isSubmitting ? "가입 중..." : "회원가입"}
                                </Button>
                            </fieldset>
                        </form>
                    </>
                )}
            </section>
        </main>
    );
}
