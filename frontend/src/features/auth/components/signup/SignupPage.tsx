"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/common/components/ui/Button";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { AuthHeading } from "@/features/auth/components/shared/AuthHeading";
import { AuthResultDialog } from "@/features/auth/components/shared/AuthResultDialog";
import { SignupAgreements } from "@/features/auth/components/signup/SignupAgreements";
import { SignupForm } from "@/features/auth/components/signup/SignupForm";
import { SocialLoginButtons } from "@/features/auth/components/social/SocialLoginButtons";
import { useSignUpMutation } from "@/features/auth/hooks/mutations/useSignUpMutation";
import { useEmailCheckQuery } from "@/features/auth/hooks/queries/useEmailCheckQuery";
import { useSocialLogin } from "@/features/auth/hooks/useSocialLogin";
import { useAuthStore } from "@/features/auth/store/authStore";
import type { SignUpRequest } from "@/features/auth/types";
import { signUpSchema, type SignUpFormValues } from "@/features/auth/schemas/authSchema";

export function SignupPage() {
    const router = useRouter();
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const form = useForm<SignUpFormValues, unknown, SignUpRequest>({
        resolver: zodResolver(signUpSchema),
        defaultValues: { name: "", nickname: "", phone: "", email: "", password: "" },
    });
    const {
        control,
        reset,
        trigger,
        getValues,
        setError,
        clearErrors,
        formState: { isSubmitting },
    } = form;
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [checkedEmail, setCheckedEmail] = useState<string | null>(null);
    const email = useWatch({ control, name: "email" });
    const { refetch: checkEmail, isFetching: isCheckingEmail } = useEmailCheckQuery(email);
    const socialLogin = useSocialLogin(setErrorMessage);
    const { mutate: signUp, isPending } = useSignUpMutation({
        onSuccess: () => {
            setSuccessMessage("회원가입이 완료되었습니다. 로그인해 주세요.");
            reset();
            setCheckedEmail(null);
        },
        onError: (error) => setErrorMessage(getApiErrorMessage(error)),
    });
    const isBusy = isSubmitting || isPending || isCheckingEmail || socialLogin.isBusy;

    useEffect(() => {
        if (isLoggedIn) router.replace("/home");
    }, [isLoggedIn, router]);

    const onSubmit = (params: SignUpRequest) => {
        setSuccessMessage("");
        setErrorMessage("");

        if (checkedEmail !== params.email) {
            setError("email", { message: "이메일 중복 확인을 해 주세요." }, { shouldFocus: true });
            return;
        }

        signUp(params);
    };

    const handleCheckEmail = async () => {
        setCheckedEmail(null);
        setErrorMessage("");
        if (!(await trigger("email"))) return;

        const requestedEmail = getValues("email");
        try {
            const { data } = await checkEmail({ throwOnError: true });
            if (getValues("email") !== requestedEmail) return;
            if (data?.available) {
                clearErrors("email");
                setCheckedEmail(requestedEmail);
            } else {
                setError("email", { message: "이미 사용 중인 이메일입니다." });
            }
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        }
    };

    return (
        <main className="bg-background flex-1 pt-16 pb-20 lg:pt-28 dark:bg-white">
            <section aria-labelledby="page-title" className="layout-container max-w-[840px]">
                <AuthHeading title="회원가입" />

                <SignupForm
                    form={form}
                    onSubmit={onSubmit}
                    isBusy={isBusy}
                    showPassword={showPassword}
                    onPasswordVisibilityChange={setShowPassword}
                    checkedEmail={checkedEmail}
                    isCheckingEmail={isCheckingEmail}
                    onCheckEmail={handleCheckEmail}
                    onEmailChange={() => {
                        setCheckedEmail(null);
                        clearErrors("email");
                    }}
                />

                <SignupAgreements isBusy={isBusy} />

                <AuthResultDialog
                    open={Boolean(errorMessage || successMessage)}
                    onOpenChange={(open) => {
                        if (!open) {
                            setErrorMessage("");
                            if (successMessage) {
                                setSuccessMessage("");
                                router.push("/login");
                            }
                        }
                    }}
                    title={successMessage ? "회원가입 완료" : "회원가입 오류"}
                    message={errorMessage || successMessage}
                />

                <div className="mt-10 border-t border-[#d3d3d3] pt-[30px]">
                    <SocialLoginButtons {...socialLogin} isBusy={isBusy} />
                </div>

                <div className="mt-[30px] flex flex-wrap items-center justify-between gap-5">
                    <p className="flex items-center gap-[6px] text-base leading-[25px] font-semibold text-[#6b6c7b]">
                        <span>이미 계정이 있으신가요?</span>
                        <Link
                            href="/login"
                            className="text-primary underline underline-offset-2 dark:text-[#6653fb]"
                        >
                            로그인하기
                        </Link>
                    </p>
                    <Button
                        type="submit"
                        form="signup-form"
                        disabled={isBusy}
                        className="bg-primary text-primary-foreground ml-auto h-[58px] rounded-full px-[50px] text-lg leading-[30px] font-semibold tracking-[0.5px] hover:bg-[#5745e7] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 dark:bg-[#6653fb] dark:text-white dark:hover:bg-[#5745e7]"
                    >
                        {isBusy ? "가입 중..." : "동의하고 가입하기"}
                    </Button>
                </div>
            </section>
        </main>
    );
}
