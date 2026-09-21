"use client";

import type { CredentialResponse } from "@react-oauth/google";

import { GoogleLoginButton } from "@/features/auth/components/social/GoogleLoginButton";
import { KakaoLoginButton } from "@/features/auth/components/social/KakaoLoginButton";
import { NaverLoginButton } from "@/features/auth/components/social/NaverLoginButton";
import type { SocialProvider } from "@/features/auth/types";

type OAuthProvider = Exclude<SocialProvider, "GOOGLE">;

interface SocialLoginButtonsProps {
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
        <div className="mx-auto mt-5 w-full max-w-[400px] space-y-2">
            <p className="text-muted-foreground text-left text-xs">소셜 로그인</p>

            <div className="flex gap-5">
                <GoogleLoginButton
                    clientId={googleClientId}
                    isBusy={isBusy}
                    onSuccess={onGoogleSuccess}
                    onError={onGoogleError}
                />
                <KakaoLoginButton
                    isConfigured={Boolean(kakaoClientId)}
                    isBusy={isBusy}
                    isRedirecting={socialRedirecting === "KAKAO"}
                    onClick={() => onAuthorize("KAKAO")}
                />
                <NaverLoginButton
                    isConfigured={Boolean(naverClientId)}
                    isBusy={isBusy}
                    isRedirecting={socialRedirecting === "NAVER"}
                    onClick={() => onAuthorize("NAVER")}
                />
            </div>
        </div>
    );
}
