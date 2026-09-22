"use client";

import type { CredentialResponse } from "@react-oauth/google";
import { cn } from "@/common/lib/utils";

import { GoogleLoginButton } from "@/features/auth/components/social/GoogleLoginButton";
import { KakaoLoginButton } from "@/features/auth/components/social/KakaoLoginButton";
import { NaverLoginButton } from "@/features/auth/components/social/NaverLoginButton";
import type { SocialProvider } from "@/features/auth/types";

type OAuthProvider = Exclude<SocialProvider, "GOOGLE">;

interface SocialLoginButtonsProps {
    className?: string;
    googleClientId?: string;
    kakaoClientId?: string;
    naverClientId?: string;
    isBusy: boolean;
    socialRedirecting: OAuthProvider | null;
    onGoogleSuccess: (response: CredentialResponse) => void;
    onGoogleError: () => void;
    onAuthorize: (provider: OAuthProvider) => void;
}

export function SocialLoginButtons({
    className,
    googleClientId,
    kakaoClientId,
    naverClientId,
    isBusy,
    socialRedirecting,
    onGoogleSuccess,
    onGoogleError,
    onAuthorize,
}: SocialLoginButtonsProps) {
    return (
        <div className={cn("border-border mt-10 w-full space-y-4 border-t pt-5", className)}>
            <p className="text-muted-foreground text-left text-base">또는 소셜 계정으로 로그인</p>

            <div className="flex gap-5">
                <NaverLoginButton
                    isConfigured={Boolean(naverClientId)}
                    isBusy={isBusy}
                    isRedirecting={socialRedirecting === "NAVER"}
                    onClick={() => onAuthorize("NAVER")}
                />
                <KakaoLoginButton
                    isConfigured={Boolean(kakaoClientId)}
                    isBusy={isBusy}
                    isRedirecting={socialRedirecting === "KAKAO"}
                    onClick={() => onAuthorize("KAKAO")}
                />
                <GoogleLoginButton
                    clientId={googleClientId}
                    isBusy={isBusy}
                    onSuccess={onGoogleSuccess}
                    onError={onGoogleError}
                />
            </div>
        </div>
    );
}
