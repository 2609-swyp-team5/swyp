"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CredentialResponse } from "@react-oauth/google";

import { Button } from "@/common/components/ui/Button";
import { Card } from "@/common/components/ui/Card";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { SocialLoginButtons } from "@/features/auth/components/social/SocialLoginButtons";
import { useLoginMutation } from "@/features/auth/hooks/mutations/useLoginMutation";
import { useSocialLoginMutation } from "@/features/auth/hooks/mutations/useSocialLoginMutation";
import { useAuthStore } from "@/features/auth/store/authStore";
import type { LoginRequest, SocialProvider } from "@/features/auth/types";
import { loginSchema } from "@/features/auth/schemas/authSchema";

type OAuthProvider = Exclude<SocialProvider, "GOOGLE">;

const oauthConfig: Record<
    OAuthProvider,
    {
        clientId: string | undefined;
        authorizeUri: string;
        redirectUri: string | undefined;
        redirectPath: string;
        state?: string;
    }
> = {
    KAKAO: {
        clientId: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID,
        authorizeUri: "https://kauth.kakao.com/oauth/authorize",
        redirectUri: process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI,
        redirectPath: "/oauth/kakao",
    },
    NAVER: {
        clientId: process.env.NEXT_PUBLIC_NAVER_CLIENT_ID,
        authorizeUri: "https://nid.naver.com/oauth2.0/authorize",
        redirectUri: process.env.NEXT_PUBLIC_NAVER_REDIRECT_URI,
        redirectPath: "/oauth/naver",
        state: process.env.NEXT_PUBLIC_NAVER_STATE ?? "swyp",
    },
};

export default function LoginPage() {
    const router = useRouter();
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const [errorMessage, setErrorMessage] = useState("");
    const [socialRedirecting, setSocialRedirecting] = useState<OAuthProvider | null>(null);
    const { mutate: login, isPending } = useLoginMutation({
        onError: (error) => setErrorMessage(getApiErrorMessage(error)),
    });
    const { mutate: socialLogin, isPending: isSocialPending } = useSocialLoginMutation({
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

    const isBusy = isSubmitting || isPending || isSocialPending || socialRedirecting !== null;

    useEffect(() => {
        if (isInitialized && isLoggedIn) {
            router.replace("/");
        }
    }, [isInitialized, isLoggedIn, router]);

    const onSubmit = (params: LoginRequest) => {
        setErrorMessage("");
        login(params);
    };

    // 구글 ID 토큰을 백엔드에 전달해 서비스 로그인 처리
    const handleGoogleSuccess = (response: CredentialResponse) => {
        if (!response.credential) {
            setErrorMessage("구글 인증 정보를 받지 못했습니다.");
            return;
        }

        setErrorMessage("");
        socialLogin({ provider: "GOOGLE", token: response.credential });
    };

    const handleSocialAuthorize = (provider: OAuthProvider) => {
        setErrorMessage("");
        const config = oauthConfig[provider];
        if (!config.clientId) {
            setErrorMessage(
                `${provider === "KAKAO" ? "카카오" : "네이버"} 로그인 설정이 필요합니다.`,
            );
            return;
        }

        const redirectUri = config.redirectUri ?? `${window.location.origin}${config.redirectPath}`;
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            ...(config.state ? { state: config.state } : {}),
        });

        setSocialRedirecting(provider);
        window.open(`${config.authorizeUri}?${params.toString()}`, "_self");
    };

    if (!isInitialized || isLoggedIn) {
        return null;
    }

    return (
        <main className="bg-muted/20 flex flex-1 items-center justify-center px-6 py-14 lg:px-8">
            <section aria-labelledby="page-title" className="w-full max-w-[500px]">
                <div className="mb-10 text-center">
                    <p className="text-muted-foreground text-sm font-semibold">
                        AI와 함께하는 똑똑한 중고거래
                    </p>
                    <p className="text-primary mt-2 text-4xl font-bold tracking-tight">지금이니?</p>
                </div>

                <Card className="bg-background block rounded-2xl border p-7 shadow-xl ring-0 shadow-black/5 sm:p-10">
                    <h1 id="page-title" className="mb-10 text-3xl font-bold tracking-tight">
                        로그인
                    </h1>

                    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                        <fieldset disabled={isBusy} className="space-y-3">
                            <div>
                                <Label className="sr-only" htmlFor="email">
                                    이메일
                                </Label>
                                <Input
                                    id="email"
                                    {...register("email")}
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby={errors.email ? "email-error" : undefined}
                                    type="email"
                                    autoComplete="email"
                                    placeholder="이메일"
                                    className="bg-background h-12 rounded-lg px-5 text-sm"
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
                                <Label className="sr-only" htmlFor="password">
                                    비밀번호
                                </Label>
                                <Input
                                    id="password"
                                    {...register("password")}
                                    aria-invalid={Boolean(errors.password)}
                                    aria-describedby={
                                        errors.password ? "password-error" : undefined
                                    }
                                    type="password"
                                    autoComplete="current-password"
                                    placeholder="비밀번호"
                                    className="bg-background h-12 rounded-lg px-5 text-sm"
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

                        <Button
                            type="submit"
                            disabled={isBusy}
                            className="h-12 w-full rounded-lg text-sm font-bold"
                        >
                            {isBusy ? "로그인 중..." : "로그인"}
                        </Button>
                    </form>

                    <SocialLoginButtons
                        googleClientId={googleClientId}
                        kakaoClientId={oauthConfig.KAKAO.clientId}
                        naverClientId={oauthConfig.NAVER.clientId}
                        isBusy={isBusy}
                        socialRedirecting={socialRedirecting}
                        onGoogleSuccess={handleGoogleSuccess}
                        onGoogleError={() => {
                            setErrorMessage("구글 인증에 실패했습니다.");
                        }}
                        onAuthorize={handleSocialAuthorize}
                    />

                    {errorMessage ? (
                        <p role="alert" className="text-destructive mt-5 text-center text-sm">
                            {errorMessage}
                        </p>
                    ) : null}

                    <div className="mx-auto mt-7 w-full max-w-[400px] space-y-3">
                        <Button
                            asChild
                            variant="secondary"
                            className="h-10 w-full rounded-lg text-sm font-semibold"
                        >
                            <Link href="/home">비회원 로그인</Link>
                        </Button>
                        <Button
                            asChild
                            variant="secondary"
                            className="h-10 w-full rounded-lg text-sm font-semibold"
                        >
                            <Link href="/signup">회원가입</Link>
                        </Button>
                    </div>

                    <Link
                        href="/account/recovery"
                        className="text-muted-foreground hover:text-foreground mt-5 inline-block text-sm hover:underline"
                    >
                        아이디/비밀번호 찾기
                    </Link>
                </Card>
            </section>
        </main>
    );
}
