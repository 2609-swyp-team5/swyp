"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse } from "@react-oauth/google";

interface GoogleLoginButtonProps {
    clientId: string;
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
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(([entry]) => {
            setWidth(Math.min(400, Math.floor(entry.contentRect.width)));
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={containerRef} className="mx-auto mt-5 min-h-10 w-full max-w-[400px]">
            <GoogleOAuthProvider clientId={clientId}>
                {isBusy ? (
                    <p role="status" className="flex h-10 items-center justify-center">
                        로그인 중...
                    </p>
                ) : width > 0 ? (
                    <GoogleLogin
                        size="large"
                        width={width}
                        onSuccess={onSuccess}
                        onError={onError}
                    />
                ) : null}
            </GoogleOAuthProvider>
        </div>
    );
}
