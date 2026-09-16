import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
    title: "지금이니?",
    description: "AI와 함께하는 똑똑한 중고거래 서비스",
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="ko" className="h-full antialiased">
            <body className="flex min-h-full flex-col">{children}</body>
        </html>
    );
}
