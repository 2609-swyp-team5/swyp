"use client";

import { useState } from "react";
import type { CredentialResponse } from "@react-oauth/google";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { useSocialLoginMutation } from "@/features/auth/hooks/mutations/useSocialLoginMutation";
import type { SocialProvider } from "@/features/auth/types";

type OAuthProvider = Exclude<SocialProvider, "GOOGLE">;

const oauthConfig = {
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
    },
};

export function useSocialLogin(setErrorMessage: (message: string) => void) {
    const [socialRedirecting, setSocialRedirecting] = useState<OAuthProvider | null>(null);
    const { mutate: socialLogin, isPending } = useSocialLoginMutation({
        onError: (error) => setErrorMessage(getApiErrorMessage(error)),
    });

    const onGoogleSuccess = (response: CredentialResponse) => {
        if (!response.credential) {
            setErrorMessage("구글 인증 정보를 받지 못했습니다.");
            return;
        }
        setErrorMessage("");
        socialLogin({ provider: "GOOGLE", token: response.credential });
    };

    const onAuthorize = (provider: OAuthProvider) => {
        setErrorMessage("");
        const config = oauthConfig[provider];
        if (!config.clientId) {
            setErrorMessage(
                `${provider === "KAKAO" ? "카카오" : "네이버"} 로그인 설정이 필요합니다.`,
            );
            return;
        }
        const redirectUri = config.redirectUri ?? `${window.location.origin}${config.redirectPath}`;
        const state =
            provider === "NAVER" ? (process.env.NEXT_PUBLIC_NAVER_STATE ?? "swyp") : undefined;
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            ...(state ? { state } : {}),
        });
        setSocialRedirecting(provider);
        window.open(`${config.authorizeUri}?${params.toString()}`, "_self");
    };

    return {
        googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        kakaoClientId: oauthConfig.KAKAO.clientId,
        naverClientId: oauthConfig.NAVER.clientId,
        isBusy: isPending || socialRedirecting !== null,
        socialRedirecting,
        onGoogleSuccess,
        onGoogleError: () => setErrorMessage("구글 인증에 실패했습니다."),
        onAuthorize,
    };
}
