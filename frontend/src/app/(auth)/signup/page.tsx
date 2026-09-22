"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { useSignUpMutation } from "@/features/auth/hooks/mutations/useSignUpMutation";
import { useEmailCheckQuery } from "@/features/auth/hooks/queries/useEmailCheckQuery";
import { useSocialLogin } from "@/features/auth/hooks/useSocialLogin";
import { SocialLoginButtons } from "@/features/auth/components/social/SocialLoginButtons";
import { useAuthStore } from "@/features/auth/store/authStore";
import type { SignUpRequest } from "@/features/auth/types";
import { signUpSchema, type SignUpFormValues } from "@/features/auth/schemas/authSchema";

export default function SignupPage() {
    const router = useRouter();
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const {
        register,
        control,
        handleSubmit,
        reset,
        trigger,
        getValues,
        setError,
        clearErrors,
        formState: { errors, isSubmitting },
    } = useForm<SignUpFormValues, unknown, SignUpRequest>({
        resolver: zodResolver(signUpSchema),
        defaultValues: { name: "", nickname: "", phone: "", email: "", password: "" },
    });
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
                    회원가입
                </h1>

                <form id="signup-form" noValidate onSubmit={handleSubmit(onSubmit)}>
                    <fieldset disabled={isBusy} className="space-y-5">
                        <div>
                            <Label className="mb-2 text-sm font-semibold" htmlFor="name">
                                이름
                            </Label>
                            <Input
                                id="name"
                                {...register("name")}
                                aria-invalid={Boolean(errors.name)}
                                aria-describedby={errors.name ? "name-error" : undefined}
                                type="text"
                                autoComplete="name"
                                placeholder="이름을 입력하세요"
                                className="bg-background h-10 rounded-md px-5 text-sm"
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
                            <Label className="mb-2 text-sm font-semibold" htmlFor="nickname">
                                닉네임
                            </Label>
                            <Input
                                id="nickname"
                                {...register("nickname")}
                                aria-invalid={Boolean(errors.nickname)}
                                aria-describedby={errors.nickname ? "nickname-error" : undefined}
                                type="text"
                                placeholder="닉네임을 입력하세요"
                                className="bg-background h-10 rounded-md px-5 text-sm"
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
                            <Label className="mb-2 text-sm font-semibold" htmlFor="phone">
                                휴대폰 번호 (선택)
                            </Label>
                            <Input
                                id="phone"
                                {...register("phone")}
                                aria-invalid={Boolean(errors.phone)}
                                aria-describedby={errors.phone ? "phone-error" : undefined}
                                type="tel"
                                autoComplete="tel"
                                placeholder="휴대폰 번호 (- 제외 입력)"
                                className="bg-background h-10 rounded-md px-5 text-sm"
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
                            <Label className="mb-2 text-sm font-semibold" htmlFor="email">
                                이메일
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    id="email"
                                    {...register("email", {
                                        onChange: () => {
                                            setCheckedEmail(null);
                                            clearErrors("email");
                                        },
                                    })}
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby={
                                        errors.email
                                            ? "email-error"
                                            : checkedEmail
                                              ? "email-check-status"
                                              : undefined
                                    }
                                    type="email"
                                    autoComplete="email"
                                    placeholder="example@email.com"
                                    className="bg-background h-10 rounded-md px-5 text-sm"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCheckEmail}
                                    className="h-10 shrink-0"
                                >
                                    {isCheckingEmail ? "확인 중..." : "중복 확인"}
                                </Button>
                            </div>
                            {errors.email ? (
                                <p
                                    id="email-error"
                                    role="alert"
                                    className="text-destructive mt-1 text-sm"
                                >
                                    {errors.email.message}
                                </p>
                            ) : checkedEmail ? (
                                <p
                                    id="email-check-status"
                                    role="status"
                                    className="mt-1 text-sm text-green-600"
                                >
                                    사용 가능한 이메일입니다.
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
                                    autoComplete="new-password"
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
                                    비밀번호는 영문과 숫자를 포함해 8~64자로 입력해 주세요.
                                </p>
                            )}
                        </div>
                    </fieldset>
                </form>

                <fieldset
                    disabled={isBusy}
                    className="border-border mt-10 space-y-3 border-y py-10"
                >
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="terms"
                            defaultChecked
                            className="data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-background size-6"
                        />
                        <Label
                            htmlFor="terms"
                            className="text-muted-foreground text-base leading-6"
                        >
                            이용약관 및 개인정보 처리방침 동의 (필수)
                        </Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="marketing"
                            className="data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-background size-6"
                        />
                        <Label
                            htmlFor="marketing"
                            className="text-muted-foreground text-base leading-6"
                        >
                            마케팅 정보 수신 및 이벤트 알림 동의 (선택)
                        </Label>
                    </div>
                </fieldset>

                <AlertDialog
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
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {successMessage ? "회원가입 완료" : "회원가입 오류"}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {errorMessage || successMessage}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction>확인</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <p className="text-muted-foreground mt-5 flex flex-wrap items-center gap-x-6 text-base">
                    이미 계정이 있으신가요?{" "}
                    <Link
                        href="/login"
                        className="text-foreground font-semibold underline underline-offset-2"
                    >
                        로그인하기
                    </Link>
                </p>
                <SocialLoginButtons
                    {...socialLogin}
                    isBusy={isBusy}
                    className="mt-4 border-t-0 pt-0"
                />

                <div className="mt-14 flex justify-end">
                    <Button
                        type="submit"
                        form="signup-form"
                        disabled={isBusy}
                        className="h-14 w-full gap-2 rounded-full text-base font-bold sm:w-[216px]"
                    >
                        {isBusy ? "가입 중..." : "동의하고 가입하기"}
                        <ArrowRight aria-hidden="true" />
                    </Button>
                </div>
            </section>
        </main>
    );
}
