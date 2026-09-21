"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/common/components/ui/Button";
import { Card } from "@/common/components/ui/Card";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useSocialLoginMutation } from "@/features/auth/hooks/mutations/useSocialLoginMutation";
import type { SocialProvider } from "@/features/auth/types";

type OAuthProvider = Exclude<SocialProvider, "GOOGLE">;

function toOAuthProvider(value: string | string[] | undefined): OAuthProvider | null {
    const provider = Array.isArray(value) ? value[0] : value;
    const normalized = provider?.toUpperCase();

    return normalized === "KAKAO" || normalized === "NAVER" ? normalized : null;
}

export default function SocialOAuthCallbackPage() {
    const params = useParams<{ provider: string }>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestStarted = useRef(false);
    const [mutationError, setMutationError] = useState("");
    const provider = toOAuthProvider(params.provider);
    const providerLabel =
        provider === "KAKAO" ? "카카오" : provider === "NAVER" ? "네이버" : "소셜";
    const providerError = searchParams.get("error_description") ?? searchParams.get("error");
    const code = searchParams.get("code");
    const callbackError = !provider
        ? "지원하지 않는 소셜 로그인입니다."
        : providerError
          ? `${providerLabel} 로그인이 취소되었거나 실패했습니다.`
          : !code
            ? "소셜 로그인 인증 코드를 받지 못했습니다."
            : "";

    const { mutate: socialLogin, isPending } = useSocialLoginMutation({
        onError: (error) => setMutationError(getApiErrorMessage(error)),
    });

    useEffect(() => {
        if (requestStarted.current) {
            return;
        }

        if (!provider) {
            requestStarted.current = true;
            return;
        }

        if (providerError) {
            requestStarted.current = true;
            return;
        }

        if (!code) {
            requestStarted.current = true;
            return;
        }

        requestStarted.current = true;
        socialLogin({ provider, token: code }, { onSuccess: () => router.replace("/home") });
    }, [code, provider, providerError, router, socialLogin]);

    const errorMessage = mutationError || callbackError;

    return (
        <main className="bg-muted/20 flex flex-1 items-center justify-center px-6 py-14">
            <Card className="bg-background w-full max-w-[420px] rounded-2xl border p-8 text-center shadow-xl ring-0 shadow-black/5">
                <h1 className="text-2xl font-bold">{providerLabel} 로그인</h1>
                {isPending ? (
                    <p role="status" className="text-muted-foreground mt-5 text-sm">
                        로그인 처리 중입니다...
                    </p>
                ) : errorMessage ? (
                    <>
                        <p role="alert" className="text-destructive mt-5 text-sm">
                            {errorMessage}
                        </p>
                        <Button asChild variant="secondary" className="mt-6 w-full">
                            <Link href="/login">로그인 화면으로 돌아가기</Link>
                        </Button>
                    </>
                ) : (
                    <p className="text-muted-foreground mt-5 text-sm">
                        로그인 정보를 확인 중입니다...
                    </p>
                )}
            </Card>
        </main>
    );
}
