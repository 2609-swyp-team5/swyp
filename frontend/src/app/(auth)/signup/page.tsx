"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Eye, EyeOff } from "lucide-react";

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
        <main className="bg-background flex-1 pt-16 pb-20 lg:pt-28 dark:bg-white">
            <section aria-labelledby="page-title" className="layout-container max-w-[840px]">
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
                    회원가입
                </h1>

                <form
                    id="signup-form"
                    noValidate
                    onSubmit={handleSubmit(onSubmit)}
                    className="mt-[50px]"
                >
                    <fieldset disabled={isBusy} className="space-y-5">
                        <div>
                            <Label
                                className="typography-body-medium mb-2 text-[length:var(--type-body-medium-size)] leading-[30px] font-semibold text-[#363636]"
                                htmlFor="name"
                            >
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
                                className="text-foreground h-12 rounded-xl px-4 text-base md:text-base"
                            />
                            {errors.name ? (
                                <p
                                    id="name-error"
                                    role="alert"
                                    className="mt-2 text-[13px] leading-5 text-[#fa503d]"
                                >
                                    {errors.name.message}
                                </p>
                            ) : null}
                        </div>

                        <div>
                            <Label
                                className="typography-body-medium mb-2 text-[length:var(--type-body-medium-size)] leading-[30px] font-semibold text-[#363636]"
                                htmlFor="nickname"
                            >
                                닉네임
                            </Label>
                            <Input
                                id="nickname"
                                {...register("nickname")}
                                aria-invalid={Boolean(errors.nickname)}
                                aria-describedby={errors.nickname ? "nickname-error" : undefined}
                                type="text"
                                placeholder="닉네임을 입력하세요"
                                className="text-foreground h-12 rounded-xl px-4 text-base md:text-base"
                            />
                            {errors.nickname ? (
                                <p
                                    id="nickname-error"
                                    role="alert"
                                    className="mt-2 text-[13px] leading-5 text-[#fa503d]"
                                >
                                    {errors.nickname.message}
                                </p>
                            ) : null}
                        </div>

                        <div>
                            <Label
                                className="typography-body-medium mb-2 text-[length:var(--type-body-medium-size)] leading-[30px] font-semibold text-[#363636]"
                                htmlFor="phone"
                            >
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
                                className="text-foreground h-12 rounded-xl px-4 text-base md:text-base"
                            />
                            {errors.phone ? (
                                <p
                                    id="phone-error"
                                    role="alert"
                                    className="mt-2 text-[13px] leading-5 text-[#fa503d]"
                                >
                                    {errors.phone.message}
                                </p>
                            ) : null}
                        </div>

                        <div>
                            <Label
                                className="typography-body-medium mb-2 text-[length:var(--type-body-medium-size)] leading-[30px] font-semibold text-[#363636]"
                                htmlFor="email"
                            >
                                이메일 주소
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
                                    className="text-foreground h-12 rounded-xl px-4 text-base md:text-base"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCheckEmail}
                                    className="h-12 shrink-0"
                                >
                                    {isCheckingEmail ? "확인 중..." : "중복 확인"}
                                </Button>
                            </div>
                            {errors.email ? (
                                <p
                                    id="email-error"
                                    role="alert"
                                    className="mt-2 text-[13px] leading-5 text-[#fa503d]"
                                >
                                    {errors.email.message}
                                </p>
                            ) : checkedEmail ? (
                                <p
                                    id="email-check-status"
                                    role="status"
                                    className="mt-2 text-[13px] leading-5 text-green-600"
                                >
                                    사용 가능한 이메일입니다.
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
                                    autoComplete="new-password"
                                    placeholder="8자 이상, 영문/숫자 조합"
                                    className="text-foreground h-12 rounded-xl pr-12 pl-4 text-base md:text-base"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                                    aria-pressed={showPassword}
                                    onClick={() => setShowPassword((value) => !value)}
                                    className="text-muted-foreground absolute top-[calc(50%-1rem)] right-2"
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
                                    비밀번호는 영문과 숫자를 포함해 8~64자로 입력해 주세요.
                                </p>
                            )}
                        </div>
                    </fieldset>
                </form>

                <fieldset
                    disabled={isBusy}
                    className="mt-10 space-y-[15px] border-t border-[#d3d3d3] pt-[50px]"
                >
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="terms"
                            defaultChecked
                            className="size-6 border-[#d3d3d3] bg-[#fafbff] data-[state=checked]:border-[#272727] data-[state=checked]:bg-[#272727] data-[state=checked]:text-white dark:bg-[#fafbff] dark:data-[state=checked]:bg-[#272727] [&_[data-slot=checkbox-indicator]>svg]:size-[18px]"
                        />
                        <Label
                            htmlFor="terms"
                            className="text-base leading-[25px] font-semibold tracking-[0.5px] break-keep text-[#6b6c7b]"
                        >
                            이용약관 및 개인정보 처리방침 동의 (필수)
                        </Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="marketing"
                            className="size-6 border-[#d3d3d3] bg-[#fafbff] data-[state=checked]:border-[#272727] data-[state=checked]:bg-[#272727] data-[state=checked]:text-white dark:bg-[#fafbff] dark:data-[state=checked]:bg-[#272727] [&_[data-slot=checkbox-indicator]>svg]:size-[18px]"
                        />
                        <Label
                            htmlFor="marketing"
                            className="text-base leading-[25px] font-semibold tracking-[0.5px] break-keep text-[#6b6c7b]"
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
                        className="bg-primary text-primary-foreground ml-auto h-[58px] rounded-full px-[50px] text-lg leading-[30px] font-semibold tracking-[0.5px] dark:bg-[#6653fb] dark:text-white"
                    >
                        {isBusy ? "가입 중..." : "동의하고 가입하기"}
                    </Button>
                </div>
            </section>
        </main>
    );
}
