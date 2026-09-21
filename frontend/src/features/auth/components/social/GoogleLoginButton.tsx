"use client";

import Image from "next/image";
import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse } from "@react-oauth/google";

import { Button } from "@/common/components/ui/Button";

interface GoogleLoginButtonProps {
    clientId?: string;
    isBusy: boolean;
    onSuccess: (response: CredentialResponse) => void;
    onError: () => void;
}

export function GoogleLoginButton({
    clientId,
    isBusy,
    onSuccess,
    onError,
}: GoogleLoginButtonProps) {
    const isConfigured = Boolean(clientId);
    const isDisabled = isBusy || !isConfigured;
    const ariaLabel = isConfigured ? "Google 계정으로 로그인" : "Google 로그인 설정 필요";

    return (
        <div className="relative flex size-9 items-center justify-center">
            <Button
                type="button"
                variant="outline"
                disabled={isDisabled}
                aria-label={ariaLabel}
                title={ariaLabel}
                className={`size-9 rounded-lg border-[#e5e7eb] bg-white p-0 hover:bg-[#f8faff] ${isDisabled ? "opacity-50" : ""}`}
            >
                <Image src="/auth/google.svg" alt="" width={20} height={20} />
            </Button>

            {clientId && !isBusy ? (
                <GoogleOAuthProvider clientId={clientId}>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0">
                        <GoogleLogin
                            type="icon"
                            theme="outline"
                            size="large"
                            shape="square"
                            width={36}
                            onSuccess={onSuccess}
                            onError={onError}
                            containerProps={{
                                "aria-label": "Google 계정으로 로그인",
                                className: "h-9 w-9 overflow-hidden",
                                style: { height: 36, width: 36 },
                            }}
                        />
                    </div>
                </GoogleOAuthProvider>
            ) : null}
        </div>
    );
}
